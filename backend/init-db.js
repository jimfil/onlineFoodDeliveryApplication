const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

async function initDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false // Changed to false for easier local initialization if chain is incomplete
    },
    multipleStatements: true
  });

  try {
    console.log(`Initializing database: ${process.env.DB_NAME}...`);

    // 1. Drop existing tables in reverse order of dependencies
    const dropQuery = `
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS Order_Item;
      DROP TABLE IF EXISTS Order_table;
      DROP TABLE IF EXISTS Product_Category_Mapping;
      DROP TABLE IF EXISTS Product_Category;
      DROP TABLE IF EXISTS Product;
      DROP TABLE IF EXISTS Customer_Address;
      DROP TABLE IF EXISTS Customer;
      DROP TABLE IF EXISTS Restaurant_Category;
      DROP TABLE IF EXISTS Restaurant;
      DROP TABLE IF EXISTS Address;
      DROP TABLE IF EXISTS Category;
      DROP TABLE IF EXISTS Account;
      SET FOREIGN_KEY_CHECKS = 1;
    `;

    console.log('Dropping old tables...');
    await connection.query(dropQuery);

    // 2. Read and execute logofood.sql
    const sqlPath = path.join(__dirname, '../database/logofood.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Creating new schema from logofood.sql...');
    await connection.query(sql);

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  } finally {
    await connection.end();
  }
}

initDb();
