const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, (req, res) => userController.getProfile(req, res));

// Update user profile
router.put('/profile', authenticateToken, (req, res) => userController.updateProfile(req, res));

// Update restaurant details
router.put('/restaurant-details', authenticateToken, (req, res) => userController.updateRestaurantDetails(req, res));

// Get user addresses
router.get('/addresses', authenticateToken, (req, res) => userController.getAddresses(req, res));

// Add new address
router.post('/addresses', authenticateToken, (req, res) => userController.addAddress(req, res));

// Update address
router.put('/addresses/:id', authenticateToken, (req, res) => userController.updateAddress(req, res));

// Delete address
router.delete('/addresses/:id', authenticateToken, (req, res) => userController.deleteAddress(req, res));

module.exports = router;