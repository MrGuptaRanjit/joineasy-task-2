const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/dbClient');
const env = require('../config/env');

function generateToken(userId, role) {
  return jwt.sign(
    { userId, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required fields.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedRole = role.toUpperCase();
    if (!['STUDENT', 'PROFESSOR'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either STUDENT or PROFESSOR.'
      });
    }

    // Check if email already registered
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    const insertResult = await db.query(
      `INSERT INTO users (name, email, password_hash, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, avatar_url, created_at`,
      [name.trim(), cleanEmail, passwordHash, normalizedRole, defaultAvatar]
    );

    let newUser = insertResult.rows[0];
    if (!newUser) {
      const fetch = await db.query('SELECT id, name, email, role, avatar_url, created_at FROM users WHERE email = $1', [cleanEmail]);
      newUser = fetch.rows[0];
    }

    // If new student, auto-enroll in sample courses for instant playground experience
    if (normalizedRole === 'STUDENT') {
      const sampleCourses = await db.query('SELECT id FROM courses LIMIT 2');
      for (const c of sampleCourses.rows) {
        await db.query(
          'INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2)',
          [c.id, newUser.id]
        );
      }
    }

    const token = generateToken(newUser.id, newUser.role);

    return res.status(201).json({
      success: true,
      message: 'Account successfully registered.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar_url: newUser.avatar_url
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await db.query(
      'SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user.id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Successfully logged in.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe
};
