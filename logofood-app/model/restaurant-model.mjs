/**
 * model/restaurant-model.mjs
 * Restaurant + product DB queries (ESM).
 * Ported from backend/services/productService.js
 */
import pool from './db.mjs';

/** Get all restaurants with their basic info and categories. */
export async function getAllRestaurants() {
  const [rows] = await pool.execute(
    `SELECT r.id, r.name, r.rating, r.estimated_preparation_time,
            r.contact_phone, r.operating_hours,
            GROUP_CONCAT(c.name SEPARATOR ',') AS categories
     FROM Restaurant r
     LEFT JOIN Restaurant_Category rc ON r.id = rc.restaurant_id
     LEFT JOIN Category c ON rc.category_id = c.id
     GROUP BY r.id
     ORDER BY r.name ASC`
  );
  // Parse categories
  return rows.map(row => ({
    ...row,
    categories: row.categories ? row.categories.split(',').filter(Boolean) : []
  }));
}

/** Get a single restaurant by id with categories. */
export async function getRestaurantById(id) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.name, r.rating, r.estimated_preparation_time,
            r.contact_phone, r.operating_hours,
            r.owner_first_name, r.owner_last_name,
            GROUP_CONCAT(c.name SEPARATOR ',') AS categories
     FROM Restaurant r
     LEFT JOIN Restaurant_Category rc ON r.id = rc.restaurant_id
     LEFT JOIN Category c ON rc.category_id = c.id
     WHERE r.id = ?
     GROUP BY r.id`,
    [id]
  );
  if (!rows[0]) return null;
  const restaurant = rows[0];
  restaurant.categories = restaurant.categories ? restaurant.categories.split(',').filter(Boolean) : [];
  return restaurant;
}

/**
 * Get all products for a restaurant, grouped under their categories.
 * Returns: [ { categoryName, products: [{id, name, price, description, image_url}] } ]
 */
export async function getRestaurantMenu(restaurantId) {
  const [rows] = await pool.execute(
    `SELECT p.id, p.name, p.price, p.description, p.image_url, p.display_order,
            pc.id AS category_id, pc.name AS category_name, pc.display_order AS cat_order
     FROM Product p
     JOIN Product_Category_Mapping pcm ON p.id = pcm.product_id
     JOIN Product_Category pc ON pcm.category_id = pc.id
     WHERE p.restaurant_id = ?
     ORDER BY pc.display_order ASC, pc.name ASC, p.display_order ASC, p.name ASC`,
    [restaurantId]
  );

  // Group into categories
  const categoryMap = new Map();
  for (const row of rows) {
    const catKey = row.category_id ?? '__none__';
    const catName = row.category_name ?? 'Χωρίς κατηγορία';
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, { categoryName: catName, products: [] });
    }
    categoryMap.get(catKey).products.push({
      id:          row.id,
      name:        row.name,
      price:       row.price,
      description: row.description,
      image_url:   row.image_url
    });
  }
  return [...categoryMap.values()];
}

/** Get flat product list for a restaurant (used by manage panel). */
export async function getRestaurantProducts(restaurantId) {
  const [rows] = await pool.execute(
    `SELECT p.*, pc.id AS category_id, pc.name AS categoryName
     FROM Product p
     JOIN Product_Category_Mapping pcm ON p.id = pcm.product_id
     JOIN Product_Category pc ON pcm.category_id = pc.id
     WHERE p.restaurant_id = ?
     ORDER BY pc.display_order ASC, p.display_order ASC`,
    [restaurantId]
  );
  return rows;
}

/** Get all product categories for a restaurant. */
export async function getAllCategories(restaurantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM Product_Category WHERE restaurant_id = ? ORDER BY display_order ASC, name ASC',
    [restaurantId]
  );
  return rows;
}

/** Create a product for a restaurant. Handles new category creation. */
export async function createProduct(restaurantId, { name, price, description, categoryId, newCategoryName, imageUrl }) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    let finalCategoryId = (categoryId === 'NEW' || !categoryId) ? null : categoryId;
    if (!finalCategoryId && newCategoryName) {
      const [existing] = await conn.execute(
        'SELECT id FROM Product_Category WHERE name = ? AND restaurant_id = ?', 
        [newCategoryName, restaurantId]
      );
      if (existing.length > 0) {
        finalCategoryId = existing[0].id;
      } else {
        const [catResult] = await conn.execute(
          'INSERT INTO Product_Category (name, restaurant_id) VALUES (?, ?)', 
          [newCategoryName, restaurantId]
        );
        finalCategoryId = catResult.insertId;
      }
    }

    const [productResult] = await conn.execute(
      'INSERT INTO Product (name, price, description, image_url, restaurant_id) VALUES (?, ?, ?, ?, ?)',
      [name, price, description || null, imageUrl || null, restaurantId]
    );
    const productId = productResult.insertId;

    if (finalCategoryId) {
      await conn.execute(
        'INSERT INTO Product_Category_Mapping (product_id, category_id) VALUES (?, ?)',
        [productId, finalCategoryId]
      );
    }

    await conn.commit();
    return { id: productId, name, price, categoryId: finalCategoryId };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/** Delete a product (verifies ownership). */
export async function deleteProduct(restaurantId, productId) {
  const [existing] = await pool.execute(
    'SELECT id FROM Product WHERE id = ? AND restaurant_id = ?',
    [productId, restaurantId]
  );
  if (existing.length === 0) throw new Error('Product not found or access denied');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.execute('DELETE FROM Product_Category_Mapping WHERE product_id = ?', [productId]);
    await conn.execute('DELETE FROM Product WHERE id = ?', [productId]);
    await conn.commit();
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}
/** Get a restaurant by its owner's account id. */
export async function getRestaurantByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT r.*, GROUP_CONCAT(c.name SEPARATOR ',') AS categories
     FROM Restaurant r
     LEFT JOIN Restaurant_Category rc ON r.id = rc.restaurant_id
     LEFT JOIN Category c ON rc.category_id = c.id
     WHERE r.id = ?
     GROUP BY r.id`,
    [userId]
  );
  if (!rows[0]) return null;
  const restaurant = rows[0];
  restaurant.categories = restaurant.categories ? restaurant.categories.split(',').filter(Boolean) : [];
  return restaurant;
}

/** Get all product categories belonging to a restaurant. */
export async function getCategoriesByRestaurant(restaurantId) {
  const [rows] = await pool.execute(
    `SELECT * FROM Product_Category WHERE restaurant_id = ? ORDER BY display_order ASC, name ASC`,
    [restaurantId]
  );
  return rows;
}

/** Reorder categories or products by swapping display_order. */
export async function reorderItem(restaurantId, type, id, direction) {
  let table = type === 'category' ? 'Product_Category' : 'Product';
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    let query, params;
    if (type === 'category') {
      query = `SELECT id, display_order FROM Product_Category WHERE restaurant_id = ? ORDER BY display_order ASC, name ASC`;
      params = [restaurantId];
    } else {
      // Find which category this product belongs to
      const [catMap] = await conn.execute(`SELECT category_id FROM Product_Category_Mapping WHERE product_id = ?`, [id]);
      if (catMap.length === 0) throw new Error('Product not mapped to category');
      const categoryId = catMap[0].category_id;
      
      query = `
        SELECT p.id, p.display_order 
        FROM Product p
        JOIN Product_Category_Mapping pcm ON p.id = pcm.product_id
        WHERE p.restaurant_id = ? AND pcm.category_id = ?
        ORDER BY p.display_order ASC, p.name ASC`;
      params = [restaurantId, categoryId];
    }

    const [items] = await conn.execute(query, params);
    const idx = items.findIndex(item => item.id == id);
    if (idx === -1) throw new Error('Item not found');

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= items.length) return; // Boundary

    // Swap items in memory
    const temp = items[idx];
    items[idx] = items[newIdx];
    items[newIdx] = temp;

    // Persist new sequential order (0, 1, 2...) to all items in this group
    for (let i = 0; i < items.length; i++) {
      await conn.execute(`UPDATE ${table} SET display_order = ? WHERE id = ?`, [i, items[i].id]);
    }

    await conn.commit();
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/** Update restaurant details and operating hours. */
export async function updateRestaurantSettings(userId, { name, estimatedPreparationTime, operatingHours, phone }) {
  await pool.execute(
    'UPDATE Restaurant SET name = ?, estimated_preparation_time = ?, operating_hours = ?, contact_phone = ? WHERE id = ?',
    [name, estimatedPreparationTime, operatingHours, phone, userId]
  );
}

/** Update restaurant categories (up to 2). */
export async function updateRestaurantCategories(restaurantId, categoryIds) {
  // Limit to 2 categories
  const ids = (categoryIds || []).slice(0, 2);
  
  // Delete existing categories
  await pool.execute(
    'DELETE FROM Restaurant_Category WHERE restaurant_id = ?',
    [restaurantId]
  );
  
  // Insert new categories
  for (const categoryId of ids) {
    await pool.execute(
      'INSERT INTO Restaurant_Category (restaurant_id, category_id) VALUES (?, ?)',
      [restaurantId, categoryId]
    );
  }
}

/** Get all available restaurant categories (global). */
export async function getAllRestaurantCategories() {
  const defaultCategories = [
    'Burger', 'Brunch', 'Pizza', 'Mexican', 'Asian', 'Σουβλάκια', 'Ψητά Σχάρας', 'Italian'
  ];

  const [rows] = await pool.execute(
    'SELECT id, name FROM Category ORDER BY name ASC'
  );

  const existingNames = rows.map(r => r.name);
  const missing = defaultCategories.filter(name => !existingNames.includes(name));

  for (const name of missing) {
    await pool.execute('INSERT INTO Category (name) VALUES (?)', [name]);
  }

  const [updatedRows] = await pool.execute(
    'SELECT id, name FROM Category ORDER BY name ASC'
  );
  return updatedRows;
}
