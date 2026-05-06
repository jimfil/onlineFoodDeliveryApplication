const userService = require('../services/userService');

class UserController {
  async getProfile(req, res) {
    try {
      const user = req.user;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        contactPhone: user.contact_phone
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const result = await userService.updateProfile(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateRestaurantDetails(req, res) {
    try {
      const userId = req.user.id;
      const result = await userService.updateRestaurantDetails(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Update restaurant details error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAddresses(req, res) {
    try {
      const userId = req.user.id;
      const addresses = await userService.getAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error('Get addresses error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async addAddress(req, res) {
    try {
      const { street, streetNumber } = req.body;
      const userId = req.user.id;

      if (!street || !streetNumber) {
        return res.status(400).json({ error: 'Street and street number are required' });
      }

      const addressId = await userService.addAddress(userId, req.body);
      res.status(201).json({
        message: 'Address added successfully',
        addressId
      });
    } catch (error) {
      console.error('Add address error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateAddress(req, res) {
    try {
      const addressId = req.params.id;
      const userId = req.user.id;

      // Check if address belongs to user
      const address = await userService.checkAddressOwnership(addressId, userId);
      if (!address) {
        return res.status(404).json({ error: 'Address not found' });
      }

      const result = await userService.updateAddress(addressId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Update address error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteAddress(req, res) {
    try {
      const addressId = req.params.id;
      const userId = req.user.id;

      // Check if address belongs to user
      const address = await userService.checkAddressOwnership(addressId, userId);
      if (!address) {
        return res.status(404).json({ error: 'Address not found' });
      }

      const result = await userService.deleteAddress(addressId, userId);
      res.json(result);
    } catch (error) {
      console.error('Delete address error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new UserController();
