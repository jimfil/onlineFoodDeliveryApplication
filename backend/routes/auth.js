const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Register new customer
router.post('/register', (req, res) => authController.register(req, res));

// Register new restaurant
router.post('/register-restaurant', (req, res) => authController.registerRestaurant(req, res));

// Login
router.post('/login', (req, res) => authController.login(req, res));

module.exports = router;