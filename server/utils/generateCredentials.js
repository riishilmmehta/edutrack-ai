const { pool } = require('../config/mysql');

/** Generates the next GR number for a given admission year, e.g. GR2026007 */
async function generateGrNumber(admissionYear) {
  const [rows] = await pool.query(
    `SELECT gr_number FROM students WHERE admission_year = ? ORDER BY id DESC LIMIT 1`,
    [admissionYear]
  );
  let nextSeq = 1;
  if (rows.length > 0) {
    const lastGr = rows[0].gr_number; // e.g. GR2026006
    const lastSeq = parseInt(lastGr.slice(-3), 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `GR${admissionYear}${String(nextSeq).padStart(3, '0')}`;
}

/** Builds an institutional email like name@schooldomain.edu, de-duplicated if needed */
async function generateInstitutionalEmail(name, domain) {
  const base = name.toLowerCase().replace(/[^a-z]/g, '');
  let candidate = `${base}@${domain}`;
  let suffix = 1;
  // Ensure uniqueness
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await pool.query(`SELECT id FROM users WHERE institutional_email = ?`, [candidate]);
    if (rows.length === 0) return candidate;
    candidate = `${base}${suffix}@${domain}`;
    suffix += 1;
  }
}

/** Generates a random initial password (used for teachers/admin/accountant) */
function generateRandomPassword(length = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

module.exports = { generateGrNumber, generateInstitutionalEmail, generateRandomPassword };
