/**
 * model/user-model.mjs
 * Customer profile + address DB queries (ESM).
 * Ported from backend/services/userService.js
 */
import pool from './db.mjs';

/** Get all saved addresses for a customer. */
export async function getAddresses(userId) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.street, a.street_number, a.zip_code, a.latitude, a.longitude, a.floor, a.comments
     FROM Address a
     JOIN Customer_Address ca ON a.id = ca.address_id
     WHERE ca.customer_id = ?
     ORDER BY a.id DESC`,
    [userId]
  );
  return rows;
}

/** Add a new address and link it to the customer. Returns the new address id. */
export async function addAddress(userId, { street, streetNumber, zipCode, latitude, longitude, floor, comments }) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.execute(
      'INSERT INTO Address (street, street_number, zip_code, latitude, longitude, floor, comments) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [street, streetNumber, zipCode || '', latitude || null, longitude || null, floor || null, comments || null]
    );
    const addressId = result.insertId;

    await conn.execute(
      'INSERT INTO Customer_Address (customer_id, address_id) VALUES (?, ?)',
      [userId, addressId]
    );

    await conn.commit();
    return addressId;
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/** Check that an address belongs to a customer. Returns the address row or null. */
export async function checkAddressOwnership(addressId, userId) {
  const [rows] = await pool.execute(
    `SELECT a.id FROM Address a
     JOIN Customer_Address ca ON a.id = ca.address_id
     WHERE a.id = ? AND ca.customer_id = ?`,
    [addressId, userId]
  );
  return rows[0] || null;
}

/** Update an existing address. */
export async function updateAddress(addressId, userId, { street, streetNumber, zipCode, floor, comments, latitude, longitude }) {
  // We first ensure the address belongs to the user
  const owned = await checkAddressOwnership(addressId, userId);
  if (!owned) throw new Error("Unauthorized or address not found");

  await pool.execute(
    'UPDATE Address SET street = ?, street_number = ?, zip_code = ?, floor = ?, comments = ?, latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude) WHERE id = ?',
    [street, streetNumber, zipCode || '', floor || null, comments || null, latitude || null, longitude || null, addressId]
  );
}

/** Get a customer by id. */
export async function getCustomerById(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM Customer WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
}

/** Delete an address (and its Customer_Address link). */
export async function deleteAddress(addressId, userId) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.execute('DELETE FROM Customer_Address WHERE address_id = ? AND customer_id = ?', [addressId, userId]);
    await conn.execute('DELETE FROM Address WHERE id = ?', [addressId]);
    await conn.commit();
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/** Update a customer's profile. */
export async function updateProfile(userId, { firstName, lastName, contactPhone }) {
  await pool.execute(
    'UPDATE Customer SET first_name = ?, last_name = ?, contact_phone = ? WHERE id = ?',
    [firstName, lastName, contactPhone || null, userId]
  );
}

/** Update restaurant details. */
export async function updateRestaurantDetails(userId, { name, estimatedPreparationTime }) {
  await pool.execute(
    'UPDATE Restaurant SET name = ?, estimated_preparation_time = ? WHERE id = ?',
    [name, estimatedPreparationTime || null, userId]
  );
}
