require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'production' ? '' : 'dev_academic_nexus_jwt_secret_key_2026');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const DATABASE_URL = process.env.DATABASE_URL || '';
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is not defined in production. Using fallback secret is not recommended.');
}

if (NODE_ENV === 'production' && !DATABASE_URL) {
  console.warn('⚠️ WARNING: DATABASE_URL is not configured in production environment.');
}

module.exports = {
  PORT,
  NODE_ENV,
  JWT_SECRET: JWT_SECRET || 'dev_academic_nexus_jwt_secret_key_2026',
  JWT_EXPIRES_IN,
  DATABASE_URL,
  FRONTEND_URL,
  CLIENT_URL: FRONTEND_URL
};
