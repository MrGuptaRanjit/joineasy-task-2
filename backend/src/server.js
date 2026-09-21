const app = require('./app');
const env = require('./config/env');
const db = require('./db/dbClient');

async function startServer() {
  try {
    // Attempt database connection at startup
    await db.initDb();

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
