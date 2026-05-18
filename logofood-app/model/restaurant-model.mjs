/**
 * model/restaurant-model.mjs
 * Restaurant + product DB queries (ESM).
 * Ported from backend/services/productService.js
 */
import pool from './db.mjs';

/** Get restaurants within 4km, with pagination. */
export async function getAllRestaurants({ lat, lon, limit = 20, offset = 0, category = null, search = null } = {}) {
  let query = `
    SELECT r.id, r.name, r.rating, r.rating_count, r.status, r.estimated_preparation_time,
           r.contact_phone, r.operating_hours, r.image_url, r.min_order_value,
           a.latitude AS latitude, a.longitude AS longitude,
           GROUP_CONCAT(c.name SEPARATOR ',') AS categories`;

  const params = [];

  if (lat != null && lon != null) {
    query += `,
           (6371 * acos(cos(radians(?)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(?)) + sin(radians(?)) * sin(radians(a.latitude)))) AS distanceKm`;
    params.push(lat, lon, lat);
  }

  query += `
     FROM Restaurant r
     LEFT JOIN Address a ON r.address_id = a.id
     LEFT JOIN Restaurant_Category rc ON r.id = rc.restaurant_id
     LEFT JOIN Category c ON rc.category_id = c.id`;

  query += `
     GROUP BY r.id, r.name, r.rating, r.rating_count, r.status, r.estimated_preparation_time,
              r.contact_phone, r.operating_hours, r.image_url, r.min_order_value,
              a.latitude, a.longitude`;

  let havingClauses = [];
  if (lat != null && lon != null) {
    havingClauses.push(`distanceKm <= 4`);
  }
  if (category && category !== 'all') {
    havingClauses.push(`FIND_IN_SET(?, categories) > 0`);
    params.push(category);
  }
  if (search) {
    havingClauses.push(`(r.name COLLATE utf8mb4_general_ci LIKE ? OR categories COLLATE utf8mb4_general_ci LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }

  if (havingClauses.length > 0) {
    query += ` HAVING ` + havingClauses.join(' AND ');
  }

  query += ` ORDER BY r.status ASC, r.name ASC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

  const [rows] = await pool.query(query, params);

  return rows.map(row => ({
    ...row,
    categories: row.categories ? row.categories.split(',').filter(Boolean) : []
  }));
}

/** Get total count of restaurants within 4km. */
export async function getRestaurantsCount({ lat, lon, category = null, search = null } = {}) {
  let query = `SELECT COUNT(*) as total FROM (
    SELECT r.id, r.name, GROUP_CONCAT(c.name SEPARATOR ',') AS categories`;

  const params = [];
  if (lat != null && lon != null) {
    query += `, (6371 * acos(cos(radians(?)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(?)) + sin(radians(?)) * sin(radians(a.latitude)))) AS distanceKm`;
    params.push(lat, lon, lat);
  }

  query += `
    FROM Restaurant r
    LEFT JOIN Address a ON r.address_id = a.id
    LEFT JOIN Restaurant_Category rc ON r.id = rc.restaurant_id
    LEFT JOIN Category c ON rc.category_id = c.id`;

  query += `
    GROUP BY r.id, r.name, a.latitude, a.longitude`;

  let havingClauses = [];
  if (lat != null && lon != null) {
    havingClauses.push(`distanceKm <= 4`);
  }
  if (category && category !== 'all') {
    havingClauses.push(`FIND_IN_SET(?, categories) > 0`);
    params.push(category);
  }
  if (search) {
    havingClauses.push(`(r.name COLLATE utf8mb4_general_ci LIKE ? OR categories COLLATE utf8mb4_general_ci LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }

  if (havingClauses.length > 0) {
    query += ` HAVING ` + havingClauses.join(' AND ');
  }

  query += `) AS sub`;

  const [rows] = await pool.query(query, params);
  return rows[0].total;
}

/** Get a single restaurant by id with categories. */
export async function getRestaurantById(id) {
  const [rows] = await pool.execute(
    `SELECT r.id, r.name, r.rating, r.rating_count, r.status, r.estimated_preparation_time,
            r.contact_phone, r.operating_hours, r.image_url, r.min_order_value,
            r.owner_first_name, r.owner_last_name,
            a.latitude, a.longitude,
            GROUP_CONCAT(c.name SEPARATOR ',') AS categories
     FROM Restaurant r
     LEFT JOIN Address a ON r.address_id = a.id
     LEFT JOIN Restaurant_Category rc ON r.id = rc.restaurant_id
     LEFT JOIN Category c ON rc.category_id = c.id
     WHERE r.id = ?
     GROUP BY r.id, r.name, r.rating, r.rating_count, r.status, r.estimated_preparation_time,
              r.contact_phone, r.operating_hours, r.image_url, r.min_order_value,
              r.owner_first_name, r.owner_last_name, a.latitude, a.longitude`,
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
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      image_url: row.image_url
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

/** Update a product for a restaurant. Handles new category creation and updating mapping. */
export async function updateProduct(restaurantId, productId, { name, price, description, categoryId, newCategoryName, imageUrl }) {
  const [existing] = await pool.execute(
    'SELECT id FROM Product WHERE id = ? AND restaurant_id = ?',
    [productId, restaurantId]
  );
  if (existing.length === 0) throw new Error('Product not found or access denied');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    let finalCategoryId = (categoryId === 'NEW' || !categoryId) ? null : categoryId;
    if (!finalCategoryId && newCategoryName) {
      const [existingCat] = await conn.execute(
        'SELECT id FROM Product_Category WHERE name = ? AND restaurant_id = ?',
        [newCategoryName, restaurantId]
      );
      if (existingCat.length > 0) {
        finalCategoryId = existingCat[0].id;
      } else {
        const [catResult] = await conn.execute(
          'INSERT INTO Product_Category (name, restaurant_id) VALUES (?, ?)',
          [newCategoryName, restaurantId]
        );
        finalCategoryId = catResult.insertId;
      }
    }

    // Update Product details
    await conn.execute(
      'UPDATE Product SET name = ?, price = ?, description = ?, image_url = ? WHERE id = ?',
      [name, price, description || null, imageUrl || null, productId]
    );

    // Update mapping
    await conn.execute(
      'DELETE FROM Product_Category_Mapping WHERE product_id = ?',
      [productId]
    );

    if (finalCategoryId) {
      await conn.execute(
        'INSERT INTO Product_Category_Mapping (product_id, category_id) VALUES (?, ?)',
        [productId, finalCategoryId]
      );
    }

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
export async function updateRestaurantSettings(userId, { name, estimatedPreparationTime, operatingHours, phone, minOrderValue }) {
  await pool.execute(
    'UPDATE Restaurant SET name = ?, estimated_preparation_time = ?, operating_hours = ?, contact_phone = ?, min_order_value = ? WHERE id = ?',
    [name, estimatedPreparationTime, operatingHours, phone, minOrderValue, userId]
  );
}

/** Toggle restaurant status between OPEN and CLOSED. */
export async function toggleRestaurantStatus(userId) {
  const [rows] = await pool.execute(
    'SELECT status FROM Restaurant WHERE id = ?',
    [userId]
  );
  if (rows.length === 0) return null;
  const newStatus = rows[0].status === 'OPEN' ? 'CLOSED' : 'OPEN';
  await pool.execute(
    'UPDATE Restaurant SET status = ? WHERE id = ?',
    [newStatus, userId]
  );
  return newStatus;
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




  const [rows] = await pool.execute(
    'SELECT id, name, image_url FROM Category ORDER BY name ASC'
  );











  return rows;
}

/** Update restaurant image URL */
export async function updateRestaurantImage(restaurantId, imageUrl) {
  await pool.execute(
    'UPDATE Restaurant SET image_url = ? WHERE id = ?',
    [imageUrl, restaurantId]
  );
}

/** Initialize default restaurant categories with images if they don't exist. */
export async function initializeCategories() {
  const categoriesData = [
    { name: 'Burger', image_url: '/images/categories/burger.jpg' },
    { name: 'American', image_url: '/images/categories/american.jpg' },
    { name: 'Fast Food', image_url: '/images/categories/fast-food.jpg' },
    { name: 'Healthy', image_url: '/images/categories/healthy.jpg' },
    { name: 'Italian', image_url: '/images/categories/italian.jpg' },
    { name: 'Seafood', image_url: '/images/categories/seafood.jpg' },
    { name: 'Brunch', image_url: '/images/categories/brunch.jpg' },
    { name: 'Pizza', image_url: '/images/categories/pizza.jpg' },
    { name: 'Mexican', image_url: '/images/categories/mexican.jpg' },
    { name: 'Asian', image_url: '/images/categories/asian.jpg' },
    { name: 'Σουβλάκια', image_url: '/images/categories/souvlakia.jpg' },
    { name: 'Ψητά Σχάρας', image_url: '/images/categories/psita-sxaras.jpg' },
    { name: 'Sushi', image_url: '/images/categories/sushi.jpg' },
    { name: 'Pasta', image_url: '/images/categories/pasta.jpg' },
    { name: 'Salads', image_url: '/images/categories/salads.jpg' },
    { name: 'Desserts', image_url: '/images/categories/desserts.jpg' },
    { name: 'Coffee', image_url: '/images/categories/coffee.jpg' },
    { name: 'Crepes', image_url: '/images/categories/crepes.jpg' }
  ];

  const [rows] = await pool.execute('SELECT name, image_url FROM Category');
  const existingCategories = rows;

  for (const cat of categoriesData) {
    const existing = existingCategories.find(c => c.name === cat.name);
    if (!existing) {
      console.log(`Initializing category: ${cat.name}`);
      await pool.execute(
        'INSERT INTO Category (name, image_url) VALUES (?, ?)',
        [cat.name, cat.image_url]
      );
    } else if (!existing.image_url || existing.image_url.startsWith('http')) {
      console.log(`Updating missing or remote image for category: ${cat.name}`);
      await pool.execute(
        'UPDATE Category SET image_url = ? WHERE name = ?',
        [cat.image_url, cat.name]
      );
    }
  }
}

