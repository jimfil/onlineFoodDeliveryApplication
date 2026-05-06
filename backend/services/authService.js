const bcrypt = require('bcryptjs');
const pool = require('../database');

class AuthService {
  async findUserByEmail(email) {
    const [existingUsers] = await pool.execute('SELECT id FROM Account WHERE email = ?', [email]);
    return existingUsers[0];
  }

  async findUserWithProfileByEmail(email) {
    const [users] = await pool.execute(
      `SELECT a.id, a.email, a.password_hashed, a.account_type, 
              c.first_name, c.last_name, c.contact_phone,
              r.name as restaurant_name, r.estimated_preparation_time
       FROM Account a 
       LEFT JOIN Customer c ON a.id = c.id 
       LEFT JOIN Restaurant r ON a.id = r.id
       WHERE a.email = ?`,
      [email]
    );
    return users[0];
  }

  async registerUser(userData) {
    const { email, password, firstName, lastName, contactPhone, street, streetNumber, zipCode, latitude, longitude } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [accountResult] = await connection.execute(
        'INSERT INTO Account (email, password_hashed, account_type) VALUES (?, ?, ?)',
        [email, hashedPassword, 'CUSTOMER']
      );

      const accountId = accountResult.insertId;

      await connection.execute(
        'INSERT INTO Customer (id, first_name, last_name, contact_phone) VALUES (?, ?, ?, ?)',
        [accountId, firstName, lastName, contactPhone || null]
      );

      if (street && streetNumber) {
        const [addrResult] = await connection.execute(
          'INSERT INTO Address (street, street_number, zip_code, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
          [street, streetNumber, zipCode || '', latitude || null, longitude || null]
        );
        await connection.execute(
          'INSERT INTO Customer_Address (customer_id, address_id) VALUES (?, ?)',
          [accountId, addrResult.insertId]
        );
      }

      await connection.commit();
      
      return {
        id: accountId,
        email,
        firstName,
        lastName,
        contactPhone
      };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async registerRestaurant(restaurantData) {
    const { email, password, businessName, firstNameOwner, lastNameOwner, phone, afm } = restaurantData;
    const hashedPassword = await bcrypt.hash(password, 10);

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [accountResult] = await connection.execute(
        'INSERT INTO Account (email, password_hashed, account_type) VALUES (?, ?, ?)',
        [email, hashedPassword, 'RESTAURANT']
      );

      const accountId = accountResult.insertId;

      await connection.execute(
        'INSERT INTO Restaurant (id, name, contact_phone, owner_first_name, owner_last_name, vat_number) VALUES (?, ?, ?, ?, ?, ?)',
        [accountId, businessName, phone, firstNameOwner, lastNameOwner, afm]
      );

      await connection.commit();
      
      return {
        id: accountId,
        email,
        businessName,
        firstNameOwner,
        lastNameOwner,
        accountType: 'RESTAURANT'
      };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = new AuthService();
