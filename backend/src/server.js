const app = require('./app');
const env = require('./config/env');
const db = require('./db/dbClient');
const migrate = require('./db/migrate');
const seed = require('./db/seed');

async function autoInitializeDatabase() {
  if (!env.DATABASE_URL) return;

  try {
    const tableCheck = await db.query(`SELECT to_regclass('public.users') as tbl_exists;`);
    const exists = tableCheck.rows[0]?.tbl_exists;

    if (!exists) {
      console.log('🔄 First-time setup: Initializing database schema...');
      await migrate();
      console.log('🌱 Populating initial demo data...');
      await seed();
      console.log('🎉 Database auto-initialization completed successfully!');
    } else {
      // Check if user table is empty
      const userCountRes = await db.query('SELECT COUNT(*) FROM users');
      const count = parseInt(userCountRes.rows[0]?.count || '0', 10);
      if (count === 0) {
        console.log('🌱 User table empty: Seeding demo accounts...');
        await seed();
      }
    }
  } catch (err) {
    console.warn('⚠️ Auto-initialization warning:', err.message);
  }
}

async function startServer() {
  try {
    // Attempt database connection at startup
    await db.initDb();

    // Auto-migrate and seed if needed
    if (db.getIsConnected()) {
      await autoInitializeDatabase();
    }

    const server = app.listen(env.PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 Academic Nexus Server running on port ${env.PORT}`);
      console.log(`📡 Health Check: http://localhost:${env.PORT}/api/health`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`==================================================`);
    });

    // Handle graceful process termination
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await db.closeDb();
        console.log('🏁 Server closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message || error);
    process.exit(1);
  }
}

startServer();
