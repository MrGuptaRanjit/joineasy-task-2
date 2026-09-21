// Verification script for Production Readiness
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'super_long_and_secure_production_secret_key_32_chars_min';
process.env.FRONTEND_URL = 'https://academic-nexus.vercel.app';
process.env.PORT = '5096';

const app = require('../app');
const http = require('http');

async function runProductionCheck() {
  console.log('🧪 Verifying Production Mode, CORS, Security Headers, and Health Endpoints...');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5096, resolve));

  try {
    // 1. Health Endpoint Check
    const healthRes = await fetch('http://localhost:5096/api/health');
    const healthData = await healthRes.json();
    console.log('  ✓ Health response status:', healthRes.status, healthData);
    if (!healthData.success || healthData.message !== 'API is running') {
      throw new Error('Health check payload mismatch');
    }

    // 2. CORS Preflight Check
    const preflightRes = await fetch('http://localhost:5096/api/courses', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://academic-nexus.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });
    console.log('  ✓ Preflight status:', preflightRes.status);
    console.log('  ✓ CORS Allow-Origin:', preflightRes.headers.get('access-control-allow-origin'));
    console.log('  ✓ CORS Allow-Headers:', preflightRes.headers.get('access-control-allow-headers'));
    console.log('  ✓ CORS Allow-Credentials:', preflightRes.headers.get('access-control-allow-credentials'));

    if (preflightRes.headers.get('access-control-allow-origin') !== 'https://academic-nexus.vercel.app') {
      throw new Error('CORS origin header missing or incorrect');
    }

    // 3. Security 401 Protected Endpoint Check
    const unauthRes = await fetch('http://localhost:5096/api/courses', {
      headers: { 'Origin': 'https://academic-nexus.vercel.app' }
    });
    const unauthData = await unauthRes.json();
    console.log('  ✓ Unauthenticated status 401 payload:', unauthData);
    if (unauthRes.status !== 401 || unauthData.success !== false) {
      throw new Error('401 error handler verification failed');
    }

    // 4. Unknown Route 404 Check
    const notFoundRes = await fetch('http://localhost:5096/api/nonexistent-route');
    const notFoundData = await notFoundRes.json();
    console.log('  ✓ 404 Not Found status:', notFoundRes.status, notFoundData);
    if (notFoundRes.status !== 404 || notFoundData.success !== false) {
      throw new Error('404 error handler verification failed');
    }

    console.log('\n✅ ALL PRODUCTION SYSTEM VERIFICATIONS PASSED SUCCESSFULLY!');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runProductionCheck().then(() => {
  // Let event loop exit cleanly
}).catch((err) => {
  console.error('❌ Production verification failed:', err);
  process.exit(1);
});
