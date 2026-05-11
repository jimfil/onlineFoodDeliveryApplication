/**
 * model/order-model.mjs
 * Order DB queries (ESM).
 */
import pool from './db.mjs';

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

    const [orderResult] = await conn.execute(
      `INSERT INTO Order_table (customer_id, restaurant_id, delivery_address_id, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [customerId, restaurantId, addressId]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      await conn.execute(
        'INSERT INTO Order_Item (order_id, product_id, quantity) VALUES (?, ?, ?)',
        [orderId, item.productId, item.quantity || 1]
      );
    }

    await conn.commit();
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
            a.street, a.street_number
     FROM Order_table o
     JOIN Restaurant r ON o.restaurant_id = r.id
     JOIN Address a ON o.delivery_address_id = a.id
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
            a.street, a.street_number
     FROM Order_table o
     LEFT JOIN Customer c ON o.customer_id = c.id
     JOIN Address a ON o.delivery_address_id = a.id
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
    `SELECT o.id AS order_id, o.created_at, o.status, 
            r.name AS restaurantName,
            a.street, a.street_number, a.floor, a.comments AS addressComments,
            oi.product_id, oi.quantity,
            p.name AS productName, p.price
     FROM Order_table o
     JOIN Restaurant r ON o.restaurant_id = r.id
     JOIN Address a ON o.delivery_address_id = a.id
     JOIN Order_Item oi ON o.id = oi.order_id
     JOIN Product p ON oi.product_id = p.id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC`,
    [customerId]
  );

  // Group items by order_id
  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        created_at: row.created_at,
        status: row.status,
        restaurantName: row.restaurantName,
        address: `${row.street} ${row.street_number}`,
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
    `SELECT o.id AS order_id, o.created_at, o.status, 
            COALESCE(c.first_name, 'Επισκέπτης') AS firstName, 
            COALESCE(c.last_name, '') AS lastName,
            COALESCE(a.phone, c.contact_phone, 'N/A') AS phone,
            a.street, a.street_number, a.floor, a.comments AS addressComments,
            oi.product_id, oi.quantity,
            p.name AS productName, p.price
     FROM Order_table o
     LEFT JOIN Customer c ON o.customer_id = c.id
     JOIN Address a ON o.delivery_address_id = a.id
     JOIN Order_Item oi ON o.id = oi.order_id
     JOIN Product p ON oi.product_id = p.id
     WHERE o.restaurant_id = ?
     ORDER BY o.created_at DESC`,
    [restaurantId]
  );

  const ordersMap = new Map();
  for (const row of rows) {
    if (!ordersMap.has(row.order_id)) {
      ordersMap.set(row.order_id, {
        id: row.order_id,
        created_at: row.created_at,
        status: row.status,
        customerName: `${row.firstName} ${row.lastName}`.trim(),
        phone: row.phone,
        address: `${row.street} ${row.street_number}`,
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
  const [rows] = await pool.execute(
    `UPDATE Order_table 
     SET status = ? 
     WHERE id = ? AND restaurant_id = ?`,
    [status, orderId, restaurantUserId]
  );
  return rows.affectedRows > 0;
}

/** Check if customer has any pending orders. */
export async function hasPendingOrdersForCustomer(customerId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM Order_table WHERE customer_id = ? AND status = 'PENDING'`,
    [customerId]
  );
  return rows[0].count > 0;
}

/** Check if restaurant has any pending orders. */
export async function hasPendingOrdersForRestaurant(restaurantId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM Order_table WHERE restaurant_id = ? AND status = 'PENDING'`,
    [restaurantId]
  );
  return rows[0].count > 0;
}
