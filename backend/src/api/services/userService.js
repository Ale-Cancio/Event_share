const pool = require('../../config/database');
const bcrypt = require('bcrypt');

class UserService {
  // Check if email already exists
  async emailExists(email) {
    const query = 'SELECT organizer_id FROM public.users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows.length > 0;
  }

  // Create a new user (organizer)
  async createUser(email, password, role = 'organizer') {
    // Check if email already exists
    const exists = await this.emailExists(email);
    if (exists) {
      throw new Error('Email already registered');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const query = `
      INSERT INTO public.users (email, password, role)
      VALUES ($1, $2, $3)
      RETURNING organizer_id, email, role, created_at
    `;
    
    const result = await pool.query(query, [email, hashedPassword, role]);
    return result.rows[0];
  }

  // Get user by email (for login later)
  async getUserByEmail(email) {
    const query = 'SELECT * FROM public.users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Verify password (for login later)
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = new UserService();