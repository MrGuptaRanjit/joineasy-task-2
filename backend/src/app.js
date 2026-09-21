const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const db = require('./db/dbClient');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const groupRoutes = require('./routes/groupRoutes');
const submissionRoutes = require('./routes/submissionRoutes');

const app = express();

// Build allowed CORS origins list
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:3000'
];

if (env.FRONTEND_URL) {
  env.FRONTEND_URL.split(',').forEach((url) => {
    const trimmed = url.trim();
    if (trimmed) {
      const withoutSlash = trimmed.replace(/\/+$/, '');
      if (!allowedOrigins.includes(withoutSlash)) {
        allowedOrigins.push(withoutSlash);
      }
    }
  });
}

// Security & CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, health probes, curl)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Check exact whitelist match or local development
    if (allowedOrigins.includes(normalizedOrigin) || env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Allow Vercel, Netlify, and Render deployment subdomains
    if (
      normalizedOrigin.endsWith('.vercel.app') ||
      normalizedOrigin.endsWith('.netlify.app') ||
      normalizedOrigin.endsWith('.onrender.com') ||
      normalizedOrigin.endsWith('.railway.app')
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy blocked access from origin: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Express body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (clean in production)
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req) => req.path === '/api/health'
  }));
}

// Health Check Endpoint (Unauthenticated, safe, reliable)
app.get('/api/health', async (req, res) => {
  const dbConnected = db.getIsConnected();
  res.status(200).json({
    success: true,
    message: 'API is running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/submissions', submissionRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
