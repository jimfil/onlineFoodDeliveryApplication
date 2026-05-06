const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool to TiDB Cloud
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
  },


  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to TiDB Cloud database.');
    connection.release();
  } catch (err) {
    console.error('Error connecting to TiDB:', err.message);
  }
})();

module.exports = pool;