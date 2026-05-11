import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to .env (expected in the parent directory of this script, i.e., root of logofood-app)
dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDb() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 4000,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true },
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
    // From logofood-app/scripts/ to database/logofood.sql
    const sqlPath = path.join(__dirname, '../../database/logofood.sql');
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
