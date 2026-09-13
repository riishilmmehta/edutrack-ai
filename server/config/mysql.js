const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected');
    conn.release();
    return true;
  } catch (err) {
    console.error('⚠️ MySQL connection warning:', err.message);
    console.error('👉 Make sure MySQL is running on port ' + (process.env.DB_PORT || 3306) + ' or start it via docker-compose');
    if (process.env.STRICT_DB === 'true') {
      process.exit(1);
    }
    return false;
  }
}

module.exports = { pool, testConnection };
