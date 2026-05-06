const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register new customer
router.post('/register', async (req, res) => {
  let connection;
  try {
    const { email, password, firstName, lastName, contactPhone, street, streetNumber } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute('SELECT id FROM Account WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get a dedicated connection for the transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert account
      const [accountResult] = await connection.execute(
        'INSERT INTO Account (email, password_hashed, account_type) VALUES (?, ?, ?)',
        [email, hashedPassword, 'CUSTOMER']
      );

      const accountId = accountResult.insertId;

      // Insert customer
      await connection.execute(
        'INSERT INTO Customer (id, first_name, last_name, contact_phone) VALUES (?, ?, ?, ?)',
        [accountId, firstName, lastName, contactPhone || null]
      );

      // Insert address if provided
      if (street && streetNumber) {
        const [addrResult] = await connection.execute(
          'INSERT INTO Address (street, street_number, zip_code, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
          [street, streetNumber, req.body.zipCode || '', req.body.latitude || null, req.body.longitude || null]
        );
        await connection.execute(
          'INSERT INTO Customer_Address (customer_id, address_id) VALUES (?, ?)',
          [accountId, addrResult.insertId]
        );
      }

      await connection.commit();

      // Generate token
      const token = generateToken(accountId);

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: accountId,
          email,
          firstName,
          lastName,
          contactPhone
        }
      });

    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});


// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user with password
    const [users] = await pool.execute(
      'SELECT a.id, a.email, a.password_hashed, a.account_type, c.first_name, c.last_name, c.contact_phone FROM Account a LEFT JOIN Customer c ON a.id = c.id WHERE a.email = ?',
      [email]
    );

    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hashed);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        contactPhone: user.contact_phone
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;