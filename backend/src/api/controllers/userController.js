const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

class UserController {
  // Register a new organizer
  async register(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Password length validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Create the user
      const newUser = await userService.createUser(email, password, 'organizer');

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.user_id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: newUser.user_id,
            email: newUser.email,
            role: newUser.role,
            createdAt: newUser.created_at
          },
          token: token
        }
      });

    } catch (error) {
      // Handle duplicate email error
      if (error.message === 'Email already registered') {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Handle other errors
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration'
      });
    }
  }

  // Login (for future use)
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Get user from database
      const user = await userService.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await userService.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.user_id,
            email: user.email,
            role: user.role
          },
          token: token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }
  }
}

module.exports = new UserController();