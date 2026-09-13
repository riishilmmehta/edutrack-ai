const { pool } = require('../config/mysql');

/**
 * Writes an entry to the MySQL audit_log table.
 * Call this after every sensitive write (account creation, grade change, fee waiver, etc.)
 */
async function writeAuditLog({ userId = null, action, targetEntity, targetId = null, details = {}, ipAddress = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, target_entity, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, targetEntity, targetId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    // Audit logging should never crash the main request — just log the failure.
    console.error('⚠️ Failed to write audit log:', err.message);
  }
}

module.exports = { writeAuditLog };
