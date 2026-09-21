const app = require('./app');
const env = require('./config/env');
const db = require('./db/dbClient');

async function startServer() {
  try {
    // Initialize DB connection
    await db.initDb();

    app.listen(env.PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 Academic Nexus Server running on port ${env.PORT}`);
      console.log(`📡 API Base: http://localhost:${env.PORT}/api`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
