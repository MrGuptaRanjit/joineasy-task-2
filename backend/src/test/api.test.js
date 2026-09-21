const seed = require('../db/seed');
const app = require('../app');
const http = require('http');

let server;
let port = 5099;
let baseUrl = `http://localhost:${port}/api`;

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
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('🧪 Starting Academic Nexus API Automated Test Suite...\n');

  // 1. Seed database first
  await seed();

  // 2. Start temporary test server
  await new Promise((resolve) => {
    server = app.listen(port, () => {
      console.log(`Test server running on port ${port}\n`);
      resolve();
    });
  });

  try {
    console.log('--- TEST GROUP 1: AUTHENTICATION & SECURITY ---');
    // Test 1: Professor Login
    const profLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'robert@university.edu', password: 'Password123!' }
    });
    assert(profLogin.status === 200, 'Professor login succeeds with status 200');
    assert(profLogin.data.user.role === 'PROFESSOR', 'Professor role matches in JWT response');
    const profToken = profLogin.data.token;

    // Test 2: Student (Leader) Login - Rahul
    const rahulLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'rahul@university.edu', password: 'Password123!' }
    });
    assert(rahulLogin.status === 200, 'Student Rahul (Leader) login succeeds');
    assert(rahulLogin.data.user.role === 'STUDENT', 'Rahul has STUDENT role');
    const rahulToken = rahulLogin.data.token;

    // Test 3: Student (Member) Login - Alex
    const alexLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'alex@university.edu', password: 'Password123!' }
    });
    assert(alexLogin.status === 200, 'Student Alex (Member) login succeeds');
    const alexToken = alexLogin.data.token;

    // Test 4: Invalid login credentials
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'robert@university.edu', password: 'WrongPassword!' }
    });
    assert(badLogin.status === 401, 'Invalid password correctly rejected with 401');

    // Test 5: Unauthenticated access
    const noAuth = await request('/courses');
    assert(noAuth.status === 401, 'Unauthenticated request to /courses rejected with 401');

    console.log('\n--- TEST GROUP 2: ROLE-BASED ACCESS CONTROL ---');
    // Test 6: Student trying to create course (forbidden)
    const studentCreateCourse = await request('/courses', {
      method: 'POST',
      token: rahulToken,
      body: { code: 'CS-999', name: 'Unauthorized Course' }
    });
    assert(studentCreateCourse.status === 403, 'Student creating course rejected with 403 Forbidden');

    // Test 7: Professor creating course
    const profCreateCourse = await request('/courses', {
      method: 'POST',
      token: profToken,
      body: { code: 'CS-500', name: 'Software Verification', description: 'Testing & QA' }
    });
    assert(profCreateCourse.status === 201, 'Professor creating course succeeds with 201 Created');

    console.log('\n--- TEST GROUP 3: COURSES & ASSIGNMENTS ---');
    // Test 8: Get courses for student
    const studentCourses = await request('/courses', { token: rahulToken });
    assert(studentCourses.status === 200, 'Student retrieves enrolled courses');
    assert(studentCourses.data.courses.length >= 2, 'Student has at least 2 enrolled courses');

    // Test 9: Get assignments
    const assignmentsRes = await request('/assignments', { token: rahulToken });
    assert(assignmentsRes.status === 200, 'Student retrieves assignments');
    const groupAssign = assignmentsRes.data.assignments.find(a => a.submission_type === 'GROUP');
    assert(!!groupAssign, 'Found seeded Group Assignment (A2)');

    console.log('\n--- TEST GROUP 4: CRITICAL GROUP SUBMISSION & LEADER ACKNOWLEDGMENT ---');
    // Group Assignment Details
    const groupAssignDetails = await request(`/assignments/${groupAssign.id}`, { token: rahulToken });
    assert(groupAssignDetails.status === 200, 'Retrieved Group Assignment details');
    const userGroup = groupAssignDetails.data.assignment.user_group;
    assert(!!userGroup, 'Rahul is recognized in group Alpha Tech Innovators');
    assert(userGroup.leader_id === rahulLogin.data.user.id, 'Rahul is identified as group leader');

    // Rahul submits group work
    const submitGroupRes = await request(`/assignments/${groupAssign.id}/submit`, {
      method: 'POST',
      token: rahulToken,
      body: {
        submission_text: 'Complete project submission with leader acknowledgment verification.',
        submission_url: 'https://github.com/alpha-tech/academic-nexus'
      }
    });
    assert(submitGroupRes.status === 200, 'Group submission submitted successfully by leader');
    const groupSubmissionId = submitGroupRes.data.submission.id;

    // SCENARIO TEST: Member Alex (NOT leader) attempts to acknowledge
    const alexAckAttempt = await request(`/submissions/${groupSubmissionId}/acknowledge`, {
      method: 'POST',
      token: alexToken
    });
    assert(alexAckAttempt.status === 403, 'Group member Alex acknowledgment REJECTED with 403 Forbidden!');
    console.log(`    Server message: "${alexAckAttempt.data.message}"`);

    // SCENARIO TEST: Leader Rahul acknowledges
    const rahulAckAttempt = await request(`/submissions/${groupSubmissionId}/acknowledge`, {
      method: 'POST',
      token: rahulToken
    });
    assert(rahulAckAttempt.status === 200, 'Group Leader Rahul successfully acknowledges submission with 200 OK');
    assert(rahulAckAttempt.data.submission.status === 'ACKNOWLEDGED', 'Submission status updated to ACKNOWLEDGED in database');

    // SCENARIO TEST: Member Alex now fetches the assignment -> Must see ACKNOWLEDGED in DB state!
    const alexAssignView = await request(`/assignments/${groupAssign.id}`, { token: alexToken });
    assert(alexAssignView.data.assignment.my_submission.status === 'ACKNOWLEDGED', 'Group member Alex now observes ACKNOWLEDGED status from DB!');
    assert(!!alexAssignView.data.assignment.my_submission.acknowledged_at, 'Group member Alex sees valid acknowledged_at timestamp!');

    // SCENARIO TEST: Professor monitors submissions -> Must see ACKNOWLEDGED in monitoring table!
    const profSubmissions = await request(`/assignments/${groupAssign.id}/submissions`, { token: profToken });
    assert(profSubmissions.status === 200, 'Professor retrieved assignment submissions monitor');
    const monitoredGroup = profSubmissions.data.submissions.find(s => s.group?.name === 'Alpha Tech Innovators');
    assert(monitoredGroup && monitoredGroup.status === 'ACKNOWLEDGED', 'Professor monitor reflects ACKNOWLEDGED status for Alpha Tech Innovators');

    console.log('\n==================================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! 100% SPEC COMPLIANCE');
    console.log('==================================================');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
