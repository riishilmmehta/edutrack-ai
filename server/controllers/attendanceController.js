const { pool } = require('../config/mysql');
const { writeAuditLog } = require('../utils/auditLog');
const Notification = require('../models/Notification');

/**
 * POST /api/attendance/mark
 * Mark attendance for one or more students (Teacher or Admin)
 */
async function markAttendance(req, res) {
  const { records } = req.body; // Array of { studentId, classId, courseId, date, status, remarks }
  const list = Array.isArray(records) ? records : [req.body];

  if (list.length === 0) {
    return res.status(400).json({ success: false, error: 'No attendance records provided' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of list) {
      const { studentId, classId, courseId, date, status = 'PRESENT', remarks = '' } = item;
      if (!studentId || !date) {
        throw new Error('studentId and date are required for each attendance record');
      }

      await conn.query(
        `INSERT INTO attendance (school_id, student_id, class_id, course_id, date, status, marked_by, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), remarks = VALUES(remarks)`,
        [req.user.school_id, studentId, classId || null, courseId || null, date, status, req.user.id, remarks]
      );

      // If marked absent, fire notification to student in MongoDB
      if (status === 'ABSENT') {
        const [studentRows] = await conn.query(`SELECT user_id FROM students WHERE id = ?`, [studentId]);
        if (studentRows.length > 0) {
          await Notification.create({
            schoolId: req.user.school_id,
            userId: studentRows[0].user_id,
            type: 'ATTENDANCE_ALERT',
            title: 'Attendance Alert: Marked Absent',
            message: `You were marked absent on ${date}. Please contact your instructor if this is an error.`,
            metadata: { date, courseId }
          }).catch(e => console.warn('Attendance notification error:', e.message));
        }
      }
    }

    await conn.commit();

    await writeAuditLog({
      userId: req.user.id,
      action: 'ATTENDANCE_MARKED',
      targetEntity: 'attendance',
      details: { count: list.length },
      ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: `Recorded attendance for ${list.length} student(s)` });
  } catch (err) {
    await conn.rollback();
    console.error('Mark attendance error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to record attendance' });
  } finally {
    conn.release();
  }
}

/**
 * GET /api/attendance
 * Retrieve attendance history with filters
 */
async function getAttendance(req, res) {
  const { studentId, classId, courseId, startDate, endDate } = req.query;

  try {
    let query = `
      SELECT a.id, a.date, a.status, a.remarks, a.created_at,
             s.id AS student_id, s.gr_number, u.name AS student_name,
             c.name AS class_name, co.title AS course_title
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN courses co ON a.course_id = co.id
      WHERE a.school_id = ?
    `;
    const params = [req.user.school_id];

    // If student role, lock to their own student profile
    if (req.user.role === 'STUDENT') {
      const [sRows] = await pool.query(`SELECT id FROM students WHERE user_id = ? AND school_id = ?`, [req.user.id, req.user.school_id]);
      if (sRows.length === 0) {
        return res.json({ success: true, attendance: [] });
      }
      query += ` AND a.student_id = ?`;
      params.push(sRows[0].id);
    } else if (studentId) {
      query += ` AND a.student_id = ?`;
      params.push(studentId);
    }

    if (classId) {
      query += ` AND a.class_id = ?`;
      params.push(classId);
    }
    if (courseId) {
      query += ` AND a.course_id = ?`;
      params.push(courseId);
    }
    if (startDate) {
      query += ` AND a.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY a.date DESC LIMIT 100`;

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, attendance: rows });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance records' });
  }
}

/**
 * GET /api/attendance/stats/:studentId
 * Summary statistics (Present %, Days, Absent, Late)
 */
async function getAttendanceStats(req, res) {
  const studentId = parseInt(req.params.studentId, 10);

  try {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total_days,
         SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_days,
         SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
         SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) AS late_days
       FROM attendance
       WHERE student_id = ? AND school_id = ?`,
      [studentId, req.user.school_id]
    );

    const stats = rows[0] || { total_days: 0, present_days: 0, absent_days: 0, late_days: 0 };
    const total = stats.total_days || 0;
    const present = stats.present_days || 0;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 100.0;

    return res.json({
      success: true,
      stats: {
        totalDays: total,
        presentDays: present,
        absentDays: stats.absent_days || 0,
        lateDays: stats.late_days || 0,
        attendancePercentage: parseFloat(percentage)
      }
    });
  } catch (err) {
    console.error('Attendance stats error:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute attendance stats' });
  }
}

module.exports = { markAttendance, getAttendance, getAttendanceStats };
