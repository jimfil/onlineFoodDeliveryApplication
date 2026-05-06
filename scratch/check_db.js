const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function check() {
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
    try {
      await connection.execute('ALTER TABLE Product ADD COLUMN image_url VARCHAR(255)');
      console.log('Column added.');
    } catch (e) {
      console.log('Column might already exist or error:', e.message);
    }

    const [products] = await connection.execute('SELECT * FROM Product');
    console.log('Current Products:', products);

    const [mappings] = await connection.execute('SELECT * FROM Product_Category_Mapping');
    console.log('Mappings:', mappings);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

check();
