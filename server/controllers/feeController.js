const { pool } = require('../config/mysql');
const { writeAuditLog } = require('../utils/auditLog');
const Notification = require('../models/Notification');

/**
 * GET /api/fees
 * Retrieve fees records (student views own; accountant/admin can filter)
 */
async function getFees(req, res) {
  const { studentId, status } = req.query;

  try {
    let query = `
      SELECT f.id, f.title, f.amount, f.due_date, f.status, f.paid_at,
             f.payment_reference, f.remarks, f.created_at,
             s.id AS student_id, s.gr_number, u.name AS student_name, u.email AS student_email
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'STUDENT') {
      const [sRows] = await pool.query(`SELECT id FROM students WHERE user_id = ?`, [req.user.id]);
      if (sRows.length === 0) return res.json({ success: true, fees: [] });
      query += ` AND f.student_id = ?`;
      params.push(sRows[0].id);
    } else if (studentId) {
      query += ` AND f.student_id = ?`;
      params.push(studentId);
    }

    if (status) {
      query += ` AND f.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY f.due_date ASC`;

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, fees: rows });
  } catch (err) {
    console.error('Fetch fees error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch fees' });
  }
}

/**
 * POST /api/fees/pay
 * Accountant or Admin marks fee as paid
 */
async function recordPayment(req, res) {
  const { feeId, paymentReference } = req.body;

  if (!feeId) {
    return res.status(400).json({ success: false, error: 'feeId is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [feeRows] = await conn.query(
      `SELECT f.id, f.title, f.amount, f.status, s.user_id
       FROM fees f
       JOIN students s ON f.student_id = s.id
       WHERE f.id = ?`,
      [feeId]
    );

    if (feeRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Fee record not found' });
    }

    const fee = feeRows[0];
    if (fee.status === 'PAID') {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Fee has already been paid' });
    }

    const ref = paymentReference || `TXN-${Date.now()}`;
    await conn.query(
      `UPDATE fees SET status = 'PAID', paid_at = NOW(), payment_reference = ? WHERE id = ?`,
      [ref, feeId]
    );

    await conn.commit();

    await writeAuditLog({
      userId: req.user.id,
      action: 'FEE_PAYMENT_RECORDED',
      targetEntity: 'fees',
      targetId: feeId,
      details: { amount: fee.amount, paymentReference: ref },
      ipAddress: req.ip
    });

    await Notification.create({
      userId: fee.user_id,
      type: 'GENERAL',
      title: 'Fee Payment Received',
      message: `Your payment of ₹${fee.amount} for "${fee.title}" has been confirmed (Ref: ${ref}).`,
      metadata: { feeId, amount: fee.amount, reference: ref }
    }).catch(e => console.warn('Notification failed:', e.message));

    return res.json({ success: true, message: 'Payment recorded successfully', paymentReference: ref });
  } catch (err) {
    await conn.rollback();
    console.error('Record payment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record payment' });
  } finally {
    conn.release();
  }
}

/**
 * POST /api/fees/waive
 * Accountant or Admin waives a fee with reason
 */
async function waiveFee(req, res) {
  const { feeId, reason } = req.body;

  if (!feeId || !reason) {
    return res.status(400).json({ success: false, error: 'feeId and reason are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [feeRows] = await conn.query(
      `SELECT f.id, f.title, f.amount, s.user_id
       FROM fees f
       JOIN students s ON f.student_id = s.id
       WHERE f.id = ?`,
      [feeId]
    );

    if (feeRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Fee record not found' });
    }

    const fee = feeRows[0];
    await conn.query(
      `UPDATE fees SET status = 'WAIVED', waived_by = ?, remarks = ? WHERE id = ?`,
      [req.user.id, reason, feeId]
    );

    await conn.commit();

    await writeAuditLog({
      userId: req.user.id,
      action: 'FEE_WAIVED',
      targetEntity: 'fees',
      targetId: feeId,
      details: { amount: fee.amount, reason },
      ipAddress: req.ip
    });

    await Notification.create({
      userId: fee.user_id,
      type: 'GENERAL',
      title: 'Fee Waived',
      message: `Your fee for "${fee.title}" has been waived. Reason: ${reason}`,
      metadata: { feeId, reason }
    }).catch(e => console.warn('Notification failed:', e.message));

    return res.json({ success: true, message: 'Fee marked as waived' });
  } catch (err) {
    await conn.rollback();
    console.error('Waive fee error:', err);
    return res.status(500).json({ success: false, error: 'Failed to waive fee' });
  } finally {
    conn.release();
  }
}

module.exports = { getFees, recordPayment, waiveFee };
