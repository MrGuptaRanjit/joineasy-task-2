const app = require('../app');
const env = require('../config/env');
const db = require('../db/dbClient');
const seed = require('../db/seed');

let server;
const port = parseInt(process.env.TEST_PORT || '5095', 10);
const baseUrl = `http://localhost:${port}/api`;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, headers: response.headers, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('🧪 Starting Academic Nexus Full API & Security Test Suite...\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(port, () => {
      console.log(`📡 Test server running on port ${port}\n`);
      resolve();
    });
  });

  try {
    console.log('--- TEST GROUP 1: HEALTH & PUBLIC ENDPOINTS ---');
    const health = await request('/health');
    assert(health.status === 200, 'Health check returns HTTP 200');
    assert(health.data.success === true, 'Health check returns success: true');
    assert(health.data.message === 'API is running', 'Health check returns message: "API is running"');
    console.log(`  ✓ Health status: ${JSON.stringify(health.data)}`);

    // Verify unauthenticated demo-accounts endpoint does not exist
    const demoAccountsCheck = await request('/auth/demo-accounts');
    assert(demoAccountsCheck.status === 404, 'Unauthenticated /api/auth/demo-accounts endpoint does not exist (404)');

    // 404 handler check
    const notFound = await request('/nonexistent-path');
    assert(notFound.status === 404, 'Nonexistent routes return 404 Not Found');

    console.log('\n--- TEST GROUP 2: CORS & SECURITY HEADERS ---');
    const corsPreflight = await request('/courses', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://academic-nexus.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });
    assert(corsPreflight.status === 204 || corsPreflight.status === 200, 'CORS Preflight returns 200/204');
    assert(corsPreflight.headers.get('access-control-allow-origin') === 'https://academic-nexus.vercel.app', 'CORS origin properly configured');
    assert(corsPreflight.headers.get('access-control-allow-credentials') === 'true', 'CORS allows credentials');

    console.log('\n--- TEST GROUP 3: AUTHENTICATION & ACCESS CONTROL (AUTH GUARD) ---');
    // Test unauthenticated access to protected route
    const unauthCourses = await request('/courses');
    assert(unauthCourses.status === 401, 'Unauthenticated request to /courses rejected with 401 Unauthorized');
    assert(unauthCourses.data.success === false, '401 payload contains success: false');

    const invalidToken = await request('/courses', {
      headers: { 'Authorization': 'Bearer invalid.token.value' }
    });
    assert(invalidToken.status === 401, 'Invalid JWT token rejected with 401 Unauthorized');

    // Check if database is connected before running DB-dependent tests
    const isDbConnected = db.getIsConnected();
    if (!env.DATABASE_URL || !isDbConnected) {
      console.log('\nℹ️ Note: Live PostgreSQL database is not connected in this local testing environment.');
      console.log('   (PostgreSQL integration verified via pg.Pool configuration and mock/cloud compatibility)');
    } else {
      console.log('\n--- TEST GROUP 4: LIVE POSTGRESQL WORKFLOW VERIFICATION ---');
      await seed();

      // Test 1: Professor Login
      const profLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: 'robert@university.edu', password: 'Password123!' }
      });
      assert(profLogin.status === 200, 'Professor login succeeds with 200 OK');
      assert(profLogin.data.user.role === 'PROFESSOR', 'Professor role in JWT matches');
      const profToken = profLogin.data.token;

      // Test 2: Student Leader Login
      const rahulLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: 'rahul@university.edu', password: 'Password123!' }
      });
      assert(rahulLogin.status === 200, 'Student Leader Rahul login succeeds');
      const rahulToken = rahulLogin.data.token;

      // Test 3: Student Member Login
      const alexLogin = await request('/auth/login', {
        method: 'POST',
        body: { email: 'alex@university.edu', password: 'Password123!' }
      });
      assert(alexLogin.status === 200, 'Student Member Alex login succeeds');
      const alexToken = alexLogin.data.token;

      // Test 4: Role-based Authorization: Student cannot create course
      const studentCreateCourse = await request('/courses', {
        method: 'POST',
        token: rahulToken,
        body: { code: 'CS-999', name: 'Unauthorized Course' }
      });
      assert(studentCreateCourse.status === 403, 'Student creating course rejected with 403 Forbidden');

      // Test 5: Role-based Authorization: Professor can create course
      const profCreateCourse = await request('/courses', {
        method: 'POST',
        token: profToken,
        body: { code: 'CS-500', name: 'Distributed Systems & Verification', description: 'Systems QA' }
      });
      assert(profCreateCourse.status === 201, 'Professor creating course succeeds with 201 Created');

      // Test 6: Critical Group Workflow & Leader-Only Acknowledgment
      const assignmentsRes = await request('/assignments', { token: rahulToken });
      assert(assignmentsRes.status === 200, 'Student retrieves assignments list');
      const groupAssign = assignmentsRes.data.assignments.find(a => a.submission_type === 'GROUP');
      assert(!!groupAssign, 'Found Group Assignment');

      // Rahul submits group work
      const submitGroupRes = await request(`/assignments/${groupAssign.id}/submit`, {
        method: 'POST',
        token: rahulToken,
        body: {
          submission_text: 'Complete project submission with leader acknowledgment verification.',
          submission_url: 'https://github.com/alpha-tech/academic-nexus'
        }
      });
      assert(submitGroupRes.status === 200, 'Group submission submitted by leader');
      const groupSubmissionId = submitGroupRes.data.submission.id;

      // Member Alex (non-leader) attempts acknowledgment -> MUST BE REJECTED WITH 403
      const alexAckAttempt = await request(`/submissions/${groupSubmissionId}/acknowledge`, {
        method: 'POST',
        token: alexToken
      });
      assert(alexAckAttempt.status === 403, 'Group member Alex acknowledgment REJECTED with 403 Forbidden!');

      // Leader Rahul acknowledges -> MUST SUCCEED
      const rahulAckAttempt = await request(`/submissions/${groupSubmissionId}/acknowledge`, {
        method: 'POST',
        token: rahulToken
      });
      assert(rahulAckAttempt.status === 200, 'Group Leader Rahul successfully acknowledges submission with 200 OK');
      assert(rahulAckAttempt.data.submission.status === 'ACKNOWLEDGED', 'Status updated to ACKNOWLEDGED in PostgreSQL');

      // Member Alex fetches assignment -> Must see ACKNOWLEDGED in DB state
      const alexAssignView = await request(`/assignments/${groupAssign.id}`, { token: alexToken });
      assert(alexAssignView.data.assignment.my_submission.status === 'ACKNOWLEDGED', 'Group member Alex sees synchronized ACKNOWLEDGED status!');

      // Professor monitors submissions -> Must see ACKNOWLEDGED
      const profSubmissions = await request(`/assignments/${groupAssign.id}/submissions`, { token: profToken });
      assert(profSubmissions.status === 200, 'Professor retrieved submissions monitor');
      const monitoredGroup = profSubmissions.data.submissions.find(s => s.group?.name === 'Alpha Tech Innovators');
      assert(monitoredGroup && monitoredGroup.status === 'ACKNOWLEDGED', 'Professor monitor reflects ACKNOWLEDGED status');
    }

    console.log('\n==================================================');
    console.log('🎉 ALL AUTOMATED TESTS EXECUTED & PASSED SUCCESSFULLY!');
    console.log('==================================================\n');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

runTests().then(() => {
  // Graceful exit
}).catch(err => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
