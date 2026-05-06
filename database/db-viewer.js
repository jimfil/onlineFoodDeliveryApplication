const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const path = require('path');

// Point to the SQLite database found in your repo
const dbPath = path.resolve(__dirname, 'logofood.db');

// Connect to the database in read-only mode to prevent accidental edits
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the logofood.db SQLite database.');
    console.log('Type ".tables" to list tables, ".exit" to quit, or enter any SQL query.\n');
});

// Set up the interactive prompt
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'logofood-db> '
});

rl.prompt();

rl.on('line', (line) => {
    const query = line.trim();

    // Handle exit commands
    if (query.toLowerCase() === '.exit' || query.toLowerCase() === 'exit') {
        db.close();
        process.exit(0);
    }

    // Handle table listing
    else if (query.toLowerCase() === '.tables') {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
            if (err) {
                console.error('Error:', err.message);
            } else {
                console.log('\nTables:');
                console.log(rows.map(r => r.name).join(' | ') + '\n');
            }
            rl.prompt();
        });
        return;
    }

    // Execute standard SQL queries
    if (query) {
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('SQL Error:', err.message);
            } else if (rows.length === 0) {
                console.log('No results found.');
            } else {
                // Use console.table for a nice CLI grid format
                console.table(rows);
            }
            rl.prompt();
        });
    } else {
        rl.prompt();
    }
}).on('close', () => {
    db.close();
    console.log('\nExiting database viewer.');
    process.exit(0);
});