/**
 * model/restaurant-model.mjs
 * Restaurant + product DB queries (ESM).
 * Ported from backend/services/productService.js
 */
import pool from './db.mjs';

/** Get all restaurants with their basic info. */
export async function getAllRestaurants() {
  const [rows] = await pool.execute(
    `SELECT r.id, r.name, r.rating, r.estimated_preparation_time,
            r.contact_phone, r.operating_hours
     FROM Restaurant r
     ORDER BY r.name ASC`
  );
  return rows;
}

/** Get a single restaurant by id. */
export async function getRestaurantById(id) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.name, r.rating, r.estimated_preparation_time,
            r.contact_phone, r.operating_hours,
            r.owner_first_name, r.owner_last_name
     FROM Restaurant r
     WHERE r.id = ?`,
    [id]
  );
  return rows[0] || null;
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
    `SELECT r.* FROM Restaurant r WHERE r.id = ?`,
    [userId]
  );
  return rows[0] || null;
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

    // 1. Get all items in current order
    let query, params;
    if (type === 'category') {
      query = `SELECT id, display_order FROM Product_Category WHERE restaurant_id = ? ORDER BY display_order ASC, name ASC`;
      params = [restaurantId];
    } else {
      query = `SELECT id, display_order FROM Product WHERE restaurant_id = ? ORDER BY display_order ASC, name ASC`;
      params = [restaurantId];
    }

    const [items] = await conn.execute(query, params);
    const idx = items.findIndex(item => item.id == id);
    if (idx === -1) throw new Error('Item not found');

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= items.length) return; // Boundary

    const itemA = items[idx];
    const itemB = items[newIdx];

    // Swap display_order
    await conn.execute(`UPDATE ${table} SET display_order = ? WHERE id = ?`, [itemB.display_order, itemA.id]);
    await conn.execute(`UPDATE ${table} SET display_order = ? WHERE id = ?`, [itemA.display_order, itemB.id]);

    await conn.commit();
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}
