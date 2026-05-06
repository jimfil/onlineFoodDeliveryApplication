const pool = require('../database');

class ProductService {
  async getAllCategories() {
    const [categories] = await pool.execute('SELECT * FROM Product_Category ORDER BY display_order ASC, name ASC');
    return categories;
  }

  async getRestaurantProducts(restaurantId) {
    const [products] = await pool.execute(
      `SELECT p.*, pc.name as categoryName 
       FROM Product p 
       LEFT JOIN Product_Category_Mapping pcm ON p.id = pcm.product_id 
       LEFT JOIN Product_Category pc ON pcm.category_id = pc.id 
       WHERE p.restaurant_id = ?
       ORDER BY pc.display_order ASC, p.display_order ASC`,
      [restaurantId]
    );
    return products;
  }

  async updateCategoryOrder(categoryId, displayOrder) {
    await pool.execute(
      'UPDATE Product_Category SET display_order = ? WHERE id = ?',
      [displayOrder, categoryId]
    );
    return { success: true };
  }

  async updateProductOrder(productId, displayOrder) {
    await pool.execute(
      'UPDATE Product SET display_order = ? WHERE id = ?',
      [displayOrder, productId]
    );
    return { success: true };
  }

  async createProduct(restaurantId, productData) {
    const { name, price, description, categoryId, newCategoryName, imageUrl } = productData;
    
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Handle Category
      let finalCategoryId = categoryId;
      if (!finalCategoryId && newCategoryName) {
        // Check if category already exists by name
        const [existing] = await connection.execute(
          'SELECT id FROM Product_Category WHERE name = ?',
          [newCategoryName]
        );
        
        if (existing.length > 0) {
          finalCategoryId = existing[0].id;
        } else {
          // Create new category
          const [catResult] = await connection.execute(
            'INSERT INTO Product_Category (name) VALUES (?)',
            [newCategoryName]
          );
          finalCategoryId = catResult.insertId;
        }
      }

      // 2. Insert Product
      const [productResult] = await connection.execute(
        'INSERT INTO Product (name, price, description, image_url, restaurant_id) VALUES (?, ?, ?, ?, ?)',
        [name, price, description, imageUrl, restaurantId]
      );
      const productId = productResult.insertId;

      // 3. Create Mapping
      if (finalCategoryId) {
        await connection.execute(
          'INSERT INTO Product_Category_Mapping (product_id, category_id) VALUES (?, ?)',
          [productId, finalCategoryId]
        );
      }

      await connection.commit();
      return { id: productId, name, price, categoryId: finalCategoryId };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteProduct(restaurantId, productId) {
    // Verify ownership before delete
    const [existing] = await pool.execute(
      'SELECT id FROM Product WHERE id = ? AND restaurant_id = ?',
      [productId, restaurantId]
    );

    if (existing.length === 0) {
      throw new Error('Product not found or access denied');
    }

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      await connection.execute('DELETE FROM Product_Category_Mapping WHERE product_id = ?', [productId]);
      await connection.execute('DELETE FROM Product WHERE id = ?', [productId]);

      await connection.commit();
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new ProductService();
