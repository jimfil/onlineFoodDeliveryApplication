const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

// Get products for the logged-in restaurant
router.get('/restaurant/products', authenticateToken, (req, res) => productController.getRestaurantProducts(req, res));

// Create a new product
router.post('/', authenticateToken, (req, res) => productController.createProduct(req, res));

// Delete a product
router.delete('/:id', authenticateToken, (req, res) => productController.deleteProduct(req, res));

// Update order of products or categories
router.put('/order', authenticateToken, (req, res) => productController.updateOrder(req, res));

module.exports = router;
