const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/mysql');
const { writeAuditLog } = require('../utils/auditLog');
const { generateGrNumber, generateInstitutionalEmail, generateRandomPassword } = require('../utils/generateCredentials');
const Notification = require('../models/Notification');

const VALID_ROLES = ['STUDENT', 'TEACHER', 'ADMIN', 'ACCOUNTANT'];

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role, status, must_change_password,
              failed_login_attempts, lockout_until
       FROM users WHERE email = ? OR institutional_email = ?`,
      [email, email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      return res.status(423).json({ success: false, error: 'Account temporarily locked. Try again later.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: `Account is ${user.status.toLowerCase()}` });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      const attempts = user.failed_login_attempts + 1;
      const lockout = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 min lock after 5 fails
      await pool.query(
        `UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?`,
        [attempts, lockout, user.id]
      );
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await writeAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetEntity: 'users',
      targetId: user.id,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: !!user.must_change_password
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
}

/**
 * POST /api/auth/register
 * Unified registration for all four roles.
 * body: { role, name, email, classId?, department?, createdBy: 'admin' | 'self' }
 */
async function register(req, res) {
  const { role, name, email, classId, department, createdBy } = req.body;

  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: 'A valid role is required' });
  }
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required' });
  }
  if (role === 'STUDENT' && !classId) {
    return res.status(400).json({ success: false, error: 'Class is required for student accounts' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const domain = process.env.SCHOOL_DOMAIN || 'edutrack.edu';
    const institutionalEmail = await generateInstitutionalEmail(name, domain);

    let plainPassword;
    let grNumber = null;

    if (role === 'STUDENT') {
      const admissionYear = new Date().getFullYear();
      grNumber = await generateGrNumber(admissionYear);
      plainPassword = grNumber; // convention: student's initial password = GR number
    } else {
      plainPassword = generateRandomPassword();
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const status = createdBy === 'self' ? 'PENDING' : 'ACTIVE';

    const [userResult] = await conn.query(
      `INSERT INTO users (name, email, institutional_email, password_hash, role, status, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name, email, institutionalEmail, passwordHash, role, status]
    );
    const userId = userResult.insertId;

    if (role === 'STUDENT') {
      await conn.query(
        `INSERT INTO students (user_id, gr_number, class_id, admission_year)
         VALUES (?, ?, ?, ?)`,
        [userId, grNumber, classId, new Date().getFullYear()]
      );
    } else if (role === 'TEACHER') {
      await conn.query(
        `INSERT INTO teachers (user_id, department_id) VALUES (?, ?)`,
        [userId, department || null]
      );
    } else if (role === 'ACCOUNTANT') {
      await conn.query(
        `INSERT INTO accountants (user_id, department) VALUES (?, ?)`,
        [userId, department || 'Finance & Bursar']
      );
    }
    // ADMIN role has no separate profile table — users row is sufficient

    await conn.commit();

    await writeAuditLog({
      userId,
      action: 'ACCOUNT_CREATED',
      targetEntity: 'users',
      targetId: userId,
      details: { role, createdBy: createdBy || 'admin' },
      ipAddress: req.ip
    });

    // Fire a welcome notification (email sending itself is wired up separately - see notifications service)
    await Notification.create({
      userId,
      type: 'WELCOME',
      title: 'Welcome to EDUTrack',
      message: `Your account has been created. Your initial password is: ${plainPassword}`,
      metadata: { role }
    });

    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        name,
        email,
        institutionalEmail,
        role,
        grNumber,
        status
      },
      initialPassword: plainPassword // shown once — frontend must display then discard
    });
  } catch (err) {
    await conn.rollback();
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Server error during registration' });
  } finally {
    conn.release();
  }
}

/**
 * POST /api/auth/change-password
 * Allows the logged-in user to change their password and clear must_change_password flag
 */
async function changePassword(req, res) {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`,
      [passwordHash, req.user.id]
    );

    await writeAuditLog({
      userId: req.user.id,
      action: 'PASSWORD_CHANGED',
      targetEntity: 'users',
      targetId: req.user.id,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update password' });
  }
}

/**
 * GET /api/auth/users/pending
 * Admin view to list all self-registered users awaiting review
 */
async function getPendingUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.institutional_email, u.role, u.status, u.created_at,
              s.gr_number, s.class_id, s.admission_year,
              t.department_id
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       WHERE u.status = 'PENDING'
       ORDER BY u.created_at DESC`
    );

    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error('Error fetching pending users:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch pending accounts' });
  }
}

/**
 * PATCH /api/auth/users/:id/status
 * Admin endpoint to approve (ACTIVE), reject (REJECTED), or suspend (SUSPENDED) an account
 */
async function updateUserStatus(req, res) {
  const targetUserId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value' });
  }

  try {
    const [result] = await pool.query(`UPDATE users SET status = ? WHERE id = ?`, [status, targetUserId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await writeAuditLog({
      userId: req.user.id,
      action: 'USER_STATUS_UPDATED',
      targetEntity: 'users',
      targetId: targetUserId,
      details: { newStatus: status },
      ipAddress: req.ip
    });

    // Notify user in MongoDB
    await Notification.create({
      userId: targetUserId,
      type: 'GENERAL',
      title: 'Account Status Updated',
      message: `Your account status has been updated to ${status}.`,
      metadata: { status }
    }).catch(e => console.warn('Notification log error:', e.message));

    return res.json({ success: true, message: `Account marked as ${status}` });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
}

module.exports = { login, register, changePassword, getPendingUsers, updateUserStatus };
