const authService = require('../services/authService');
const { generateToken } = require('../middleware/auth');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const existingUser = await authService.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const user = await authService.registerUser(req.body);
      const token = generateToken(user.id);

      res.status(201).json({
        message: 'Registration successful',
        token,
        user
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async registerRestaurant(req, res) {
    try {
      const { email, password, businessName, firstNameOwner, lastNameOwner } = req.body;

      if (!email || !password || !businessName || !firstNameOwner || !lastNameOwner) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const existingUser = await authService.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const restaurant = await authService.registerRestaurant(req.body);
      const token = generateToken(restaurant.id);

      res.status(201).json({
        message: 'Restaurant registration successful',
        token,
        user: restaurant
      });
    } catch (error) {
      console.error('Restaurant registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await authService.findUserWithProfileByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await authService.verifyPassword(password, user.password_hashed);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user.id);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          accountType: user.account_type,
          firstName: user.first_name || user.owner_first_name,
          lastName: user.last_name || user.owner_last_name,
          restaurantName: user.restaurant_name,
          preparationTime: user.estimated_preparation_time
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();
