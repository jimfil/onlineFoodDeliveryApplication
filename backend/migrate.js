const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });

  try {
    console.log('Adding image_url column...');
    await connection.execute('ALTER TABLE Product ADD COLUMN image_url VARCHAR(255)');
    console.log('Column added successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column image_url already exists.');
    } else {
      console.error('Migration error:', error);
    }
  } finally {
    await connection.end();
  }
}

migrate();
