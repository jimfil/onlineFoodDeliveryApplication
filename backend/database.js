const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, '..', 'database', 'logofood.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database with schema
function initializeDatabase() {
  const schemaPath = path.join(__dirname, '..', 'database', 'logofood.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found:', schemaPath);
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Split schema into individual statements
  const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

  // Execute each statement
  statements.forEach((statement, index) => {
    db.run(statement.trim() + ';', (err) => {
      if (err) {
        if (err.message.includes('already exists')) {
          // Table already exists from a previous run; ignore this error
          return;
        }
        console.error(`Error executing statement ${index + 1}:`, err.message);
      }
    });
  });

  console.log('Database initialized with schema.');
}

// Promisify database operations for easier async/await usage
const dbAsync = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = { db, dbAsync };