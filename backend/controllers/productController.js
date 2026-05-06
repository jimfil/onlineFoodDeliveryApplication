const productService = require('../services/productService');

class ProductController {
  async getCategories(req, res) {
    try {
      const categories = await productService.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRestaurantProducts(req, res) {
    try {
      const restaurantId = req.user.id; // Assuming authenticateToken middleware is used
      const products = await productService.getRestaurantProducts(restaurantId);
      res.json(products);
    } catch (error) {
      console.error('Get restaurant products error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createProduct(req, res) {
    try {
      const restaurantId = req.user.id;
      const product = await productService.createProduct(restaurantId, req.body);
      res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      const restaurantId = req.user.id;
      const productId = req.params.id;
      const result = await productService.deleteProduct(restaurantId, productId);
      res.json(result);
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }

  async updateOrder(req, res) {
    try {
      const { type, items } = req.body; // type: 'product' or 'category', items: [{id, order}]
      
      if (type === 'category') {
        for (const item of items) {
          await productService.updateCategoryOrder(item.id, item.order);
        }
      } else {
        for (const item of items) {
          await productService.updateProductOrder(item.id, item.order);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ProductController();
