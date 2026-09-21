const { Pool } = require('pg');
const env = require('../config/env');

let pool = null;
let isConnected = false;

// Safe URL sanitizer to prevent credentials from leaking into logs
function sanitizeDbUrl(url) {
  if (!url) return 'Not Provided';
  try {
    return url.replace(/:([^:@]+)@/, ':****@');
  } catch {
    return 'Masked URL';
  }
}

// Determine SSL requirement for cloud providers (Neon, Supabase, Render, Railway, etc.)
function getSslConfig() {
  if (!env.DATABASE_URL) return false;
  
  const isProduction = env.NODE_ENV === 'production';
  const urlLower = env.DATABASE_URL.toLowerCase();
  const hasSslInUrl = urlLower.includes('sslmode=require') || urlLower.includes('ssl=true');
  const isCloudProvider = 
    urlLower.includes('neon.tech') || 
    urlLower.includes('supabase.co') || 
    urlLower.includes('render.com') ||
    urlLower.includes('railway.app') ||
    urlLower.includes('cockroachlabs.cloud') ||
    urlLower.includes('amazonaws.com');
  
  const forceSsl = process.env.DATABASE_SSL === 'true' || process.env.PGSSLMODE === 'require';

  if (isProduction || hasSslInUrl || isCloudProvider || forceSsl) {
    return { rejectUnauthorized: false };
  }

  return false;
}

// Initialize Database connection pool
async function initDb() {
  if (pool) {
    return pool;
  }

  if (!env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set. PostgreSQL client is waiting for configuration.');
    isConnected = false;
    return null;
  }

  try {
    const ssl = getSslConfig();
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.error('💥 Unexpected idle client error on PostgreSQL pool:', err.message);
    });

    // Test connection with lightweight query
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      isConnected = true;
      console.log('✅ Connected to PostgreSQL database:', sanitizeDbUrl(env.DATABASE_URL));
    } finally {
      client.release();
    }

    return pool;
  } catch (err) {
    isConnected = false;
    console.error('❌ PostgreSQL connection error:', err.message);
    console.warn('⚠️ Server will continue running, but database-dependent endpoints will return errors until database is available.');
    return null;
  }
}

// Unified query runner for PostgreSQL
async function query(text, params = []) {
  if (!pool) {
    await initDb();
  }

  if (!pool) {
    const error = new Error('Database is unavailable. Please verify DATABASE_URL connection.');
    error.statusCode = 503;
    throw error;
  }

  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    // Log without exposing raw query secrets
    console.error('Database query error:', err.message);
    throw err;
  }
}

// Graceful pool shutdown
async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}

module.exports = {
  query,
  initDb,
  closeDb,
  getPool: () => pool,
  getIsConnected: () => isConnected,
  getIsPostgres: () => true
};
