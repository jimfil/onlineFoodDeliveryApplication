const pool = require('../database');

class UserService {
  async updateProfile(userId, profileData) {
    const { firstName, lastName, contactPhone } = profileData;
    await pool.execute(
      'UPDATE Customer SET first_name = ?, last_name = ?, contact_phone = ? WHERE id = ?',
      [firstName, lastName, contactPhone, userId]
    );
    return { message: 'Profile updated successfully' };
  }

  async updateRestaurantDetails(userId, restaurantData) {
    const { name, estimatedPreparationTime } = restaurantData;
    await pool.execute(
      'UPDATE Restaurant SET name = ?, estimated_preparation_time = ? WHERE id = ?',
      [name, estimatedPreparationTime, userId]
    );
    return { message: 'Restaurant details updated successfully' };
  }

  async getAddresses(userId) {
    const [addresses] = await pool.execute(
      'SELECT a.id, a.street, a.street_number, a.zip_code, a.latitude, a.longitude FROM Address a JOIN Customer_Address ca ON a.id = ca.address_id WHERE ca.customer_id = ? ORDER BY a.id DESC',
      [userId]
    );
    return addresses;
  }

  async addAddress(userId, addressData) {
    const { street, streetNumber, zipCode, latitude, longitude } = addressData;
    
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'INSERT INTO Address (street, street_number, zip_code, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
        [street, streetNumber, zipCode || '', latitude || null, longitude || null]
      );

      const addressId = result.insertId;

      await connection.execute(
        'INSERT INTO Customer_Address (customer_id, address_id) VALUES (?, ?)',
        [userId, addressId]
      );

      await connection.commit();
      return addressId;
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async checkAddressOwnership(addressId, userId) {
    const [addresses] = await pool.execute(
      'SELECT a.id FROM Address a JOIN Customer_Address ca ON a.id = ca.address_id WHERE a.id = ? AND ca.customer_id = ?',
      [addressId, userId]
    );
    return addresses[0];
  }

  async updateAddress(addressId, addressData) {
    const { street, streetNumber, zipCode, latitude, longitude } = addressData;
    await pool.execute(
      'UPDATE Address SET street = ?, street_number = ?, zip_code = ?, latitude = ?, longitude = ? WHERE id = ?',
      [street, streetNumber, zipCode || '', latitude, longitude, addressId]
    );
    return { message: 'Address updated successfully' };
  }

  async deleteAddress(addressId, userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      await connection.execute('DELETE FROM Customer_Address WHERE address_id = ? AND customer_id = ?', [addressId, userId]);
      await connection.execute('DELETE FROM Address WHERE id = ?', [addressId]);

      await connection.commit();
      return { message: 'Address deleted successfully' };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new UserService();
