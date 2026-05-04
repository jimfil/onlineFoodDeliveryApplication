const express = require('express');
const { dbAsync } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      contactPhone: user.contact_phone
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, contactPhone } = req.body;
    const userId = req.user.id;

    await dbAsync.run(
      'UPDATE Customer SET first_name = ?, last_name = ?, contact_phone = ? WHERE id = ?',
      [firstName, lastName, contactPhone, userId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user addresses
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await dbAsync.all(
      'SELECT id, street, street_number, latitude, longitude FROM Address WHERE customer_id = ?',
      [userId]
    );

    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new address
router.post('/addresses', authenticateToken, async (req, res) => {
  try {
    const { street, streetNumber, latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!street || !streetNumber) {
      return res.status(400).json({ error: 'Street and street number are required' });
    }

    const result = await dbAsync.run(
      'INSERT INTO Address (street, street_number, latitude, longitude, customer_id) VALUES (?, ?, ?, ?, ?)',
      [street, streetNumber, latitude || null, longitude || null, userId]
    );

    res.status(201).json({
      message: 'Address added successfully',
      addressId: result.lastID
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update address
router.put('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const addressId = req.params.id;
    const { street, streetNumber, latitude, longitude } = req.body;
    const userId = req.user.id;

    // Check if address belongs to user
    const address = await dbAsync.get(
      'SELECT id FROM Address WHERE id = ? AND customer_id = ?',
      [addressId, userId]
    );

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await dbAsync.run(
      'UPDATE Address SET street = ?, street_number = ?, latitude = ?, longitude = ? WHERE id = ?',
      [street, streetNumber, latitude, longitude, addressId]
    );

    res.json({ message: 'Address updated successfully' });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete address
router.delete('/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user.id;

    // Check if address belongs to user
    const address = await dbAsync.get(
      'SELECT id FROM Address WHERE id = ? AND customer_id = ?',
      [addressId, userId]
    );

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await dbAsync.run('DELETE FROM Address WHERE id = ?', [addressId]);

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;