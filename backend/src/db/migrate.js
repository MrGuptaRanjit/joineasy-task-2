const fs = require('fs');
const path = require('path');
const db = require('./dbClient');
const env = require('../config/env');

async function migrate() {
  console.log('🔄 Running PostgreSQL database schema migration...');

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required to run migrations.');
  }

  const pool = await db.initDb();
  if (!pool) {
    throw new Error('Migration failed: Unable to establish connection to PostgreSQL.');
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('📦 Applying schema definitions from schema.sql...');
    await client.query(schemaSql);
    console.log('✅ PostgreSQL database schema applied successfully!');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate().then(async () => {
    console.log('🏁 Migration process finished.');
    await db.closeDb();
    process.exit(0);
  }).catch(async (err) => {
    console.error('❌ Migration failed:', err.message || err);
    await db.closeDb();
    process.exit(1);
  });
}

module.exports = migrate;
