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
