const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

// Get all categories
router.get('/', (req, res) => productController.getCategories(req, res));

module.exports = router;
