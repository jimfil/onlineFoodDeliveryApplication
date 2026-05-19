/**
 * model/account-model.mjs
 * Auth-related DB queries (ESM).
 * Ported from backend/services/authService.js
 */
import pool from './db.mjs';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** Find a minimal account row by email (just id). */
export async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id FROM Account WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

/**
 * Find a full user record (with Customer/Restaurant profile) by email.
 * Used for login.
 */
export async function findWithProfileByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.email, a.password_hashed, a.account_type,
            c.first_name, c.last_name, c.contact_phone,
            r.name AS restaurant_name, r.estimated_preparation_time
     FROM Account a
     LEFT JOIN Customer c ON a.id = c.id
     LEFT JOIN Restaurant r ON a.id = r.id
     WHERE a.email = ?`,
    [email]
  );
  return rows[0] || null;
}

/** Hash a plain-text password. */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Verify a plain-text password against a hash. */
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Register a new customer.
 * Returns { id, email, firstName, lastName }
 */
export async function registerCustomer({ email, password, firstName, lastName, contactPhone,
                                         street, streetNumber, zipCode, latitude, longitude }) {
  const hashed = await hashPassword(password);
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [accResult] = await conn.execute(
      'INSERT INTO Account (email, password_hashed, account_type) VALUES (?, ?, ?)',
      [email, hashed, 'CUSTOMER']
    );
    const id = accResult.insertId;

    await conn.execute(
      'INSERT INTO Customer (id, first_name, last_name, contact_phone) VALUES (?, ?, ?, ?)',
      [id, firstName, lastName, contactPhone || null]
    );

    if (street && streetNumber) {
      const [addrResult] = await conn.execute(
        'INSERT INTO Address (street, street_number, zip_code, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
        [street, streetNumber, zipCode || '', latitude || null, longitude || null]
      );
      await conn.execute(
        'INSERT INTO Customer_Address (customer_id, address_id) VALUES (?, ?)',
        [id, addrResult.insertId]
      );
    }

    await conn.commit();
    return { id, email, firstName, lastName, contactPhone, accountType: 'CUSTOMER' };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Register a new restaurant owner.
 * Returns { id, email, businessName, accountType }
 */
export async function registerRestaurant({ email, password, businessName,
                                           firstNameOwner, lastNameOwner, phone, afm, 
                                           estimatedPreparationTime, operatingHours,
                                           street, streetNumber, zipCode, latitude, longitude,
                                           minOrderValue, categories }) {
  const hashed = await hashPassword(password);
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Create Account
    const [accResult] = await conn.execute(
      'INSERT INTO Account (email, password_hashed, account_type) VALUES (?, ?, ?)',
      [email, hashed, 'RESTAURANT']
    );
    const id = accResult.insertId;

    // 2. Create Address
    let addressId = null;
    if (street && streetNumber) {
      const [addrResult] = await conn.execute(
        'INSERT INTO Address (street, street_number, zip_code, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
        [street, streetNumber, zipCode || '', latitude || null, longitude || null]
      );
      addressId = addrResult.insertId;
    }

    // 3. Create Restaurant Profile
    await conn.execute(
      `INSERT INTO Restaurant 
       (id, name, contact_phone, owner_first_name, owner_last_name, vat_number, estimated_preparation_time, operating_hours, address_id, min_order_value) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, businessName, phone || null, firstNameOwner, lastNameOwner, afm || null, estimatedPreparationTime || "20", operatingHours || null, addressId, minOrderValue || 0]
    );

    // 4. Create Restaurant Categories
    if (categories) {
      const categoryIds = Array.isArray(categories) ? categories : [categories];
      const filteredIds = categoryIds.filter(cid => cid && cid.trim() !== '').slice(0, 2);
      for (const cid of filteredIds) {
        await conn.execute(
          'INSERT INTO Restaurant_Category (restaurant_id, category_id) VALUES (?, ?)',
          [id, cid]
        );
      }
    }

    await conn.commit();
    return { id, email, businessName, firstNameOwner, lastNameOwner, accountType: 'RESTAURANT' };
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Delete an account and its associated profile.
 * Cleans up orphaned Address records.
 */
export async function deleteAccount(accountId, accountType) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    let addressIdsToDelete = [];

    // Gather address IDs to delete so they aren't left orphaned
    if (accountType === 'CUSTOMER') {
      const [rows] = await conn.execute(
        'SELECT address_id FROM Customer_Address WHERE customer_id = ?',
        [accountId]
      );
      addressIdsToDelete = rows.map(r => r.address_id);
    } else if (accountType === 'RESTAURANT') {
      const [rows] = await conn.execute(
        'SELECT address_id FROM Restaurant WHERE id = ?',
        [accountId]
      );
      if (rows[0] && rows[0].address_id) {
        addressIdsToDelete.push(rows[0].address_id);
      }
    }

    // Delete the account (ON DELETE CASCADE will handle Customer/Restaurant, Products, etc.)
    await conn.execute('DELETE FROM Account WHERE id = ?', [accountId]);

    // Clean up orphaned addresses
    for (const addrId of addressIdsToDelete) {
      // Ignore errors if the address is referenced somewhere else (e.g., Order_table)
      await conn.execute('DELETE FROM Address WHERE id = ?', [addrId]).catch(() => {});
    }

    await conn.commit();
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}
