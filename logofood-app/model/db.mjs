/**
 * model/db.mjs
 * MySQL connection pool (ESM) — connects to TiDB Cloud.
 * Equivalent of backend/database.js converted to ESM.
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 4000,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection at startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to TiDB Cloud database.');
    conn.release();
  } catch (err) {
    console.error('DB connection error:', err.message);
  }
})();

export default pool;
