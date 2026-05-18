/**
 * model/order-model.mjs
 * Order DB queries (ESM).
 */
import pool from './db.mjs';
import appEvents from '../utils/events.mjs';

/**
 * Create a new order with its items.
 * @param {number} customerId
 * @param {number} restaurantId
 * @param {number} addressId
 * @param {Array<{productId: number, quantity: number}>} items
 * @returns {number} new order id
 */
export async function createOrder(customerId, restaurantId, addressId, items) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [addrRows] = await conn.execute(
      `SELECT street, street_number FROM Address WHERE id = ?`, [addressId]
    );
    const addressText = addrRows.length > 0 ? `${addrRows[0].street} ${addrRows[0].street_number}` : 'Διεγράφη η διεύθυνση';

    const [orderResult] = await conn.execute(
      `INSERT INTO Order_table (customer_id, restaurant_id, delivery_address_id, status, delivery_address_text)
       VALUES (?, ?, ?, 'PENDING', ?)`,
      [customerId, restaurantId, addressId, addressText]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      await conn.execute(
        'INSERT INTO Order_Item (order_id, product_id, quantity, price_at_order_time) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.quantity || 1, item.price || 0]
      );
    }

    await conn.commit();
    appEvents.emit('order:changed');
    return orderId;
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/** Get all orders for a customer (most recent first). */
export async function getOrdersByCustomer(customerId) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.created_at, o.status, r.name AS restaurantName,
            a.street, a.street_number, o.delivery_address_text
     FROM Order_table o
     JOIN Restaurant r ON o.restaurant_id = r.id
     LEFT JOIN Address a ON o.delivery_address_id = a.id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC`,
    [customerId]
  );
  return rows;
}

/** Get all orders for a restaurant (most recent first). */
export async function getOrdersByRestaurant(restaurantId) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.created_at, o.status, 
            COALESCE(c.first_name, 'Επισκέπτης') AS first_name, 
            COALESCE(c.last_name, '') AS last_name,
            a.street, a.street_number, o.delivery_address_text
     FROM Order_table o
     LEFT JOIN Customer c ON o.customer_id = c.id
     LEFT JOIN Address a ON o.delivery_address_id = a.id
     WHERE o.restaurant_id = ?
     ORDER BY o.created_at DESC`,
    [restaurantId]
  );
  return rows;
}

/** 
 * Get full order details for a customer, including items and restaurant info.
 * Grouped by order_id.
 */
export async function getOrdersByCustomerId(customerId) {
  const [rows] = await pool.execute(
    `SELECT o.id AS order_id, o.created_at, o.completed_at, o.status, o.rating, o.delivery_address_text,
            r.name AS restaurantName,
            a.street, a.street_number, a.floor, a.comments AS addressComments,
            oi.product_id, oi.quantity,
            p.name AS productName, p.price
     FROM Order_table o
     JOIN Restaurant r ON o.restaurant_id = r.id
     LEFT JOIN Address a ON o.delivery_address_id = a.id
     JOIN Order_Item oi ON o.id = oi.order_id
     JOIN Product p ON oi.product_id = p.id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC
     LIMIT 10`,
    [customerId]
  );

  // Group items by order_id
  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        created_at: row.created_at,
        completed_at: row.completed_at,
        status: row.status,
        rating: row.rating,
        restaurantName: row.restaurantName,
        address: row.street ? `${row.street} ${row.street_number}` : (row.delivery_address_text || 'Η διεύθυνση διαγράφηκε'),
        floor: row.floor,
        comments: row.addressComments,
        items: [],
        total: 0
      });
    }
    const order = ordersMap.get(row.order_id);
    order.items.push({
      productName: row.productName,
      quantity: row.quantity,
      price: row.price
    });
    order.total += row.price * row.quantity;
  }

  return Array.from(ordersMap.values());
}

/**
 * Get detailed orders for a restaurant (most recent first), including items and customer info.
 * Grouped by order_id.
 */
export async function getOrdersByRestaurantDetailed(restaurantId) {
  const [rows] = await pool.execute(
    `SELECT o.id AS order_id, o.created_at, o.completed_at, o.status, o.delivery_address_text,
            COALESCE(c.first_name, 'Επισκέπτης') AS firstName, 
            COALESCE(c.last_name, '') AS lastName,
            COALESCE(c.contact_phone, 'N/A') AS phone,
            a.street, a.street_number, a.floor, a.comments AS addressComments,
            oi.product_id, oi.quantity,
            p.name AS productName, p.price
     FROM Order_table o
     LEFT JOIN Customer c ON o.customer_id = c.id
     LEFT JOIN Address a ON o.delivery_address_id = a.id
     JOIN Order_Item oi ON o.id = oi.order_id
     JOIN Product p ON oi.product_id = p.id
     WHERE o.restaurant_id = ?
     ORDER BY o.created_at DESC
     LIMIT 20`,
    [restaurantId]
  );

  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        created_at: row.created_at,
        completed_at: row.completed_at,
        status: row.status,
        customerName: `${row.firstName} ${row.lastName}`.trim(),
        phone: row.phone,
        address: row.street ? `${row.street} ${row.street_number}` : (row.delivery_address_text || 'Η διεύθυνση διαγράφηκε'),
        floor: row.floor,
        comments: row.addressComments,
        items: [],
        total: 0
      });
    }
    const order = ordersMap.get(row.order_id);
    order.items.push({
      productName: row.productName,
      quantity: row.quantity,
      price: row.price
    });
    order.total += row.price * row.quantity;
  }

  return Array.from(ordersMap.values());
}

/** Update order status if the restaurant owns it. */
export async function updateOrderStatus(orderId, restaurantUserId, status) {
  // Verify ownership first
  let query = `UPDATE Order_table SET status = ?`;
  let params = [status];
  
  if (status === 'COMPLETED') {
    query += `, completed_at = NOW()`;
  }
  
  query += ` WHERE id = ? AND restaurant_id = ?`;
  params.push(orderId, restaurantUserId);

  const [rows] = await pool.execute(query, params);
  const success = rows.affectedRows > 0;
  if (success) {
    appEvents.emit('order:changed');
  }
  return success;
}

/** Count pending orders for a customer. */
export async function countPendingOrdersForCustomer(customerId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM Order_table WHERE customer_id = ? AND status = 'PENDING'`,
    [customerId]
  );
  return rows[0].count;
}

/** Count pending orders for a restaurant. */
export async function countPendingOrdersForRestaurant(restaurantId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM Order_table WHERE restaurant_id = ? AND status = 'PENDING'`,
    [restaurantId]
  );
  return rows[0].count;
}

/** Count pending orders for guest IDs. */
export async function countPendingOrdersForGuest(orderIds) {
  if (!orderIds || orderIds.length === 0) return 0;
  const placeholders = orderIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM Order_table WHERE id IN (${placeholders}) AND status = 'PENDING'`,
    orderIds
  );
  return rows[0].count;
}

/** Check if customer has any pending orders. */
export async function hasPendingOrdersForCustomer(customerId) {
  return (await countPendingOrdersForCustomer(customerId)) > 0;
}

/** Check if restaurant has any pending orders. */
export async function hasPendingOrdersForRestaurant(restaurantId) {
  return (await countPendingOrdersForRestaurant(restaurantId)) > 0;
}

/** Get full order details for specific order IDs (for guests). */
export async function getOrdersByIds(orderIds) {
  if (!orderIds || orderIds.length === 0) return [];
  
  const placeholders = orderIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT o.id AS order_id, o.created_at, o.status, o.rating, o.delivery_address_text,
            r.name AS restaurantName,
            a.street, a.street_number, a.floor, a.comments AS addressComments,
            oi.product_id, oi.quantity,
            p.name AS productName, p.price
     FROM Order_table o
     JOIN Restaurant r ON o.restaurant_id = r.id
     LEFT JOIN Address a ON o.delivery_address_id = a.id
     JOIN Order_Item oi ON o.id = oi.order_id
     JOIN Product p ON oi.product_id = p.id
     WHERE o.id IN (${placeholders})
     ORDER BY o.created_at DESC
     LIMIT 10`,
    orderIds
  );

  // Group items by order_id
  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        created_at: row.created_at,
        status: row.status,
        rating: row.rating,
        restaurantName: row.restaurantName,
        address: row.street ? `${row.street} ${row.street_number}` : (row.delivery_address_text || 'Η διεύθυνση διαγράφηκε'),
        floor: row.floor,
        comments: row.addressComments,
        items: [],
        total: 0
      });
    }
    const order = ordersMap.get(row.order_id);
    order.items.push({
      productName: row.productName,
      quantity: row.quantity,
      price: row.price
    });
    order.total += row.price * row.quantity;
  }

  return Array.from(ordersMap.values());
}

/** Check if guest has any pending orders based on session IDs. */
export async function hasPendingOrdersForGuest(orderIds) {
  if (!orderIds || orderIds.length === 0) return false;
  
  const placeholders = orderIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM Order_table WHERE id IN (${placeholders}) AND status = 'PENDING'`,
    orderIds
  );
  return rows[0].count > 0;
}

/**
 * Rate an order and update restaurant average rating.
 */
export async function rateOrder(orderId, rating) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Get restaurant_id and check if already rated
    const [orders] = await conn.execute(
      'SELECT restaurant_id, rating FROM Order_table WHERE id = ?',
      [orderId]
    );
    if (orders.length === 0 || orders[0].rating !== null) {
      await conn.rollback();
      return false;
    }
    const restaurantId = orders[0].restaurant_id;

    // 2. Update Order rating
    await conn.execute(
      'UPDATE Order_table SET rating = ? WHERE id = ?',
      [rating, orderId]
    );

    // 3. Update Restaurant stats
    const [restaurants] = await conn.execute(
      'SELECT rating, rating_count FROM Restaurant WHERE id = ?',
      [restaurantId]
    );
    if (restaurants.length > 0) {
      const oldRating = restaurants[0].rating || 0;
      const oldCount = restaurants[0].rating_count || 0;
      const newCount = oldCount + 1;
      const newRating = ((oldRating * oldCount) + parseFloat(rating)) / newCount;

      await conn.execute(
        'UPDATE Restaurant SET rating = ?, rating_count = ? WHERE id = ?',
        [newRating.toFixed(1), newCount, restaurantId]
      );
    }

    await conn.commit();
    return true;
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

