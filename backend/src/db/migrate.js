const fs = require('fs');
const path = require('path');
const db = require('./dbClient');
const env = require('../config/env');

async function migrate() {
  console.log('🔄 Running PostgreSQL database schema migration...');

  if (!env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is required to run migrations.');
    process.exit(1);
  }

  const pool = await db.initDb();
  if (!pool) {
    console.error('❌ Migration failed: Unable to establish connection to PostgreSQL.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    const client = await pool.connect();
    try {
      console.log('📦 Applying schema definitions from schema.sql...');
      await client.query(schemaSql);
      console.log('✅ PostgreSQL database schema applied successfully!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Migration failed with error:', err.message);
    process.exit(1);
  } finally {
    await db.closeDb();
  }
}

if (require.main === module) {
  migrate().then(() => {
    console.log('🏁 Migration process finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
