const baseUrl = process.env.TEST_API_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const seed = require('../db/seed');
const db = require('../db/dbClient');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASSED: ${message}`);
}

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

async function runAutonomousQA() {
  console.log('====================================================');
  console.log('🔍 RUNNING COMPREHENSIVE AUTONOMOUS QA & SECURITY MATRIX');
  console.log('====================================================\n');

  // STEP 0: Reset Database to Clean State via Seed
  console.log('📦 Step 0: Database Seeding & Integrity Initialization');
  await seed();
  assert(true, 'Database seeded successfully with clean initial state');

  // Verify DB Tables & Constraints
  const userCheck = await db.query('SELECT COUNT(*) as count FROM users');
  assert(parseInt(userCheck.rows[0].count) >= 6, 'Users table populated with >= 6 users');

  const courseCheck = await db.query('SELECT COUNT(*) as count FROM courses');
  assert(parseInt(courseCheck.rows[0].count) >= 3, 'Courses table populated with >= 3 courses');

  const assignmentCheck = await db.query('SELECT COUNT(*) as count FROM assignments');
  assert(parseInt(assignmentCheck.rows[0].count) >= 4, 'Assignments table populated with >= 4 assignments');

  const groupCheck = await db.query('SELECT COUNT(*) as count FROM groups');
  assert(parseInt(groupCheck.rows[0].count) >= 2, 'Groups table populated with >= 2 groups');

  console.log('\n🔐 Section 1: Authentication & Account Flow Tests');
  // 1.1 Valid Professor Login
  const profLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'robert@university.edu', password: 'Password123!' }
  });
  assert(profLogin.status === 200, 'Professor Dr. Robert Davis login returns HTTP 200');
  assert(profLogin.data.user.role === 'PROFESSOR', 'Professor role is verified as PROFESSOR');
  assert(!!profLogin.data.token, 'JWT Token generated for Professor');
  const profToken = profLogin.data.token;

  // 1.2 Valid Student Leader Login (Rahul)
  const rahulLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'rahul@university.edu', password: 'Password123!' }
  });
  assert(rahulLogin.status === 200, 'Student Leader Rahul login returns HTTP 200');
  assert(rahulLogin.data.user.role === 'STUDENT', 'Rahul role is verified as STUDENT');
  const rahulToken = rahulLogin.data.token;

  // 1.3 Valid Student Member Login (Alex)
  const alexLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'alex@university.edu', password: 'Password123!' }
  });
  assert(alexLogin.status === 200, 'Student Member Alex login returns HTTP 200');
  const alexToken = alexLogin.data.token;

  // 1.4 Valid Student Member Login (Priya)
  const priyaLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'priya@university.edu', password: 'Password123!' }
  });
  assert(priyaLogin.status === 200, 'Student Member Priya login returns HTTP 200');
  const priyaToken = priyaLogin.data.token;

  // 1.5 Invalid Password Rejection
  const badPass = await request('/auth/login', {
    method: 'POST',
    body: { email: 'rahul@university.edu', password: 'WrongPassword999!' }
  });
  assert(badPass.status === 401, 'Invalid password rejected with HTTP 401 Unauthorized');

  // 1.6 Non-existent Email Rejection
  const badEmail = await request('/auth/login', {
    method: 'POST',
    body: { email: 'nobody@university.edu', password: 'Password123!' }
  });
  assert(badEmail.status === 401, 'Non-existent email rejected with HTTP 401');

  // 1.7 New Student Registration
  const testStudentEmail = `qa_student_${Date.now()}@university.edu`;
  const registerStudent = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'QA Test Student',
      email: testStudentEmail,
      password: 'Password123!',
      role: 'STUDENT'
    }
  });
  assert(registerStudent.status === 201, 'New student registration returns HTTP 201 Created');
  assert(registerStudent.data.user.email === testStudentEmail, 'Registered student email matches');
  assert(registerStudent.data.user.role === 'STUDENT', 'Registered student role matches STUDENT');

  // 1.8 Duplicate Email Registration Blocked
  const dupEmail = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Duplicate QA',
      email: testStudentEmail,
      password: 'Password123!',
      role: 'STUDENT'
    }
  });
  assert(dupEmail.status === 409, 'Duplicate email registration blocked with HTTP 409 Conflict');

  // 1.9 GET /api/auth/me Verification
  const meRes = await request('/auth/me', { token: profToken });
  assert(meRes.status === 200 && meRes.data.user.email === 'robert@university.edu', 'GET /api/auth/me validates JWT session profile');

  // 1.10 Unauthenticated Token Rejection
  const unauthRes = await request('/auth/me');
  assert(unauthRes.status === 401, 'Request without token blocked with HTTP 401');

  const badTokenRes = await request('/auth/me', { token: 'invalid.jwt.token.here' });
  assert(badTokenRes.status === 401, 'Request with forged token blocked with HTTP 401');

  console.log('\n🛡️ Section 2: Role Authorization Matrix & Security Perimeter');
  // 2.1 Student attempting to create a course (FORBIDDEN)
  const studentCreateCourse = await request('/courses', {
    method: 'POST',
    token: rahulToken,
    body: { code: 'CS-FORBIDDEN', name: 'Illegal Course' }
  });
  assert(studentCreateCourse.status === 403, 'Student creating course blocked with HTTP 403 Forbidden');

  // 2.2 Student attempting to create an assignment (FORBIDDEN)
  const studentCreateAssign = await request('/assignments', {
    method: 'POST',
    token: rahulToken,
    body: {
      course_id: 1,
      title: 'Hacked Assignment',
      description: 'Illegal',
      deadline: '2026-12-31',
      submission_type: 'INDIVIDUAL'
    }
  });
  assert(studentCreateAssign.status === 403, 'Student creating assignment blocked with HTTP 403 Forbidden');

  // 2.3 Student attempting to grade a submission (FORBIDDEN)
  const studentGrade = await request('/submissions/1/grade', {
    method: 'POST',
    token: rahulToken,
    body: { grade: 100, feedback: 'Self-awarded 100' }
  });
  assert(studentGrade.status === 403, 'Student grading submission blocked with HTTP 403 Forbidden');

  // 2.4 Student attempting to access professor submissions monitor (FORBIDDEN)
  const studentMonitor = await request('/assignments/1/submissions', {
    token: rahulToken
  });
  assert(studentMonitor.status === 403, 'Student accessing submissions monitor blocked with HTTP 403 Forbidden');

  console.log('\n📚 Section 3: Course & Curriculum Management (Professor & Student Flows)');
  // 3.1 Professor creates a new course
  const newCourseCode = `CS-${Math.floor(100 + Math.random() * 800)}`;
  const createCourseRes = await request('/courses', {
    method: 'POST',
    token: profToken,
    body: {
      code: newCourseCode,
      name: 'Scalable Microservices & Cloud Infrastructure',
      description: 'Designing resilient microservices using Docker, Kubernetes, and event brokers.',
      semester: 'Fall 2026'
    }
  });
  assert(createCourseRes.status === 201, `Professor successfully creates new course ${newCourseCode}`);
  const createdCourseId = createCourseRes.data.course.id;

  // 3.2 Student enrolls in new course
  const enrollRes = await request(`/courses/${createdCourseId}/enroll`, {
    method: 'POST',
    token: rahulToken
  });
  assert(enrollRes.status === 200, 'Student successfully enrolls in course');

  // 3.3 Duplicate enrollment prevented
  const dupEnrollRes = await request(`/courses/${createdCourseId}/enroll`, {
    method: 'POST',
    token: rahulToken
  });
  assert(dupEnrollRes.status === 400, 'Duplicate enrollment correctly rejected with HTTP 400');

  // 3.4 Professor creates assignment in this course
  const createAssignRes = await request('/assignments', {
    method: 'POST',
    token: profToken,
    body: {
      course_id: createdCourseId,
      title: 'Kubernetes Ingress & TLS Configuration',
      description: 'Set up cert-manager and configure automated SSL certificate issuance.',
      deadline: '2026-10-31T23:59:59.000Z',
      submission_type: 'INDIVIDUAL',
      max_score: 100
    }
  });
  assert(createAssignRes.status === 201, 'Professor creates assignment with HTTP 201 Created');
  const createdAssignId = createAssignRes.data.assignment.id;

  // 3.5 Professor edits assignment
  const editAssignRes = await request(`/assignments/${createdAssignId}`, {
    method: 'PUT',
    token: profToken,
    body: {
      title: 'Kubernetes Ingress & TLS Configuration (Updated)',
      max_score: 120
    }
  });
  assert(editAssignRes.status === 200, 'Professor edits assignment successfully');
  assert(editAssignRes.data.assignment.title.includes('(Updated)'), 'Updated assignment title verified');
  assert(editAssignRes.data.assignment.max_score === 120, 'Updated max score verified as 120');

  console.log('\n📝 Section 4: Individual Assignment Submission Workflow');
  // 4.1 Student submits individual assignment
  const indSubRes = await request(`/assignments/${createdAssignId}/submit`, {
    method: 'POST',
    token: rahulToken,
    body: {
      submission_text: 'Deployed Ingress-Nginx with Let\'s Encrypt staging certificates.',
      submission_url: 'https://github.com/rahul/k8s-ingress-lab'
    }
  });
  assert(indSubRes.status === 200, 'Student submits individual assignment successfully');
  const indSubId = indSubRes.data.submission.id;

  // 4.2 Verify persistence in database
  const checkSubFromDb = await db.query('SELECT * FROM submissions WHERE id = $1', [indSubId]);
  assert(checkSubFromDb.rows.length === 1, 'Individual submission record exists in database');
  assert(checkSubFromDb.rows[0].status === 'SUBMITTED', 'Database status is SUBMITTED');
  assert(checkSubFromDb.rows[0].submission_url === 'https://github.com/rahul/k8s-ingress-lab', 'Submission URL persisted accurately');

  // 4.3 Student acknowledges own individual submission
  const indAckRes = await request(`/submissions/${indSubId}/acknowledge`, {
    method: 'POST',
    token: rahulToken
  });
  assert(indAckRes.status === 200, 'Student acknowledges individual submission');
  const checkIndAckDb = await db.query('SELECT status, acknowledged_at FROM submissions WHERE id = $1', [indSubId]);
  assert(checkIndAckDb.rows[0].status === 'ACKNOWLEDGED', 'Individual submission updated to ACKNOWLEDGED in database');
  assert(!!checkIndAckDb.rows[0].acknowledged_at, 'Database stores valid acknowledged_at timestamp');

  // 4.4 Professor reviews and grades individual submission
  const profGradeRes = await request(`/submissions/${indSubId}/grade`, {
    method: 'POST',
    token: profToken,
    body: {
      grade: 118,
      feedback: 'Excellent SSL configuration and clean manifest documentation.'
    }
  });
  assert(profGradeRes.status === 200, 'Professor successfully grades individual submission');
  const checkGradeDb = await db.query('SELECT grade, feedback FROM submissions WHERE id = $1', [indSubId]);
  assert(checkGradeDb.rows[0].grade === 118, 'Grade score 118 persisted in database');

  console.log('\n👥 Section 5: CRITICAL Group Assignment & Leader Acknowledgment Workflow');
  // Find the seeded Group Assignment (Team Project: Collaborative Academic SaaS Platform)
  const assignList = await request('/assignments', { token: rahulToken });
  const teamAssign = assignList.data.assignments.find(a => a.submission_type === 'GROUP');
  assert(!!teamAssign, 'Seeded Group Assignment found');

  // 5.1 Rahul (Leader) submits group assignment deliverable
  const groupSubRes = await request(`/assignments/${teamAssign.id}/submit`, {
    method: 'POST',
    token: rahulToken,
    body: {
      submission_text: 'Complete Academic Nexus full-stack submission with React UI, PostgreSQL relational tables, and leader acknowledgment verification.',
      submission_url: 'https://github.com/alpha-tech/academic-nexus-platform'
    }
  });
  assert(groupSubRes.status === 200, 'Group deliverable submitted by leader Rahul');
  const groupSubId = groupSubRes.data.submission.id;

  // 5.2 Verify DB submission status is SUBMITTED
  const grpSubDb = await db.query('SELECT status, acknowledged_at, group_id FROM submissions WHERE id = $1', [groupSubId]);
  assert(grpSubDb.rows[0].status === 'SUBMITTED', 'Group submission status is SUBMITTED in database');
  assert(grpSubDb.rows[0].acknowledged_at === null, 'acknowledged_at is initially NULL in database');

  // 5.3 Member Alex attempts to acknowledge -> MUST BE REJECTED with 403
  const alexAttempt = await request(`/submissions/${groupSubId}/acknowledge`, {
    method: 'POST',
    token: alexToken
  });
  assert(alexAttempt.status === 403, 'Group Member Alex acknowledgment attempt REJECTED with HTTP 403 Forbidden');
  console.log(`    Server security response: "${alexAttempt.data.message}"`);

  // 5.4 Member Priya attempts to acknowledge -> MUST BE REJECTED with 403
  const priyaAttempt = await request(`/submissions/${groupSubId}/acknowledge`, {
    method: 'POST',
    token: priyaToken
  });
  assert(priyaAttempt.status === 403, 'Group Member Priya acknowledgment attempt REJECTED with HTTP 403 Forbidden');

  // 5.5 Leader Rahul acknowledges -> MUST SUCCEED with 200 OK
  const rahulAckRes = await request(`/submissions/${groupSubId}/acknowledge`, {
    method: 'POST',
    token: rahulToken
  });
  assert(rahulAckRes.status === 200, 'Group Leader Rahul acknowledges submission with HTTP 200 OK');

  // 5.6 Verify Database Record
  const ackDbCheck = await db.query('SELECT status, acknowledged_at, acknowledged_by FROM submissions WHERE id = $1', [groupSubId]);
  assert(ackDbCheck.rows[0].status === 'ACKNOWLEDGED', 'Group submission status updated to ACKNOWLEDGED in database');
  assert(!!ackDbCheck.rows[0].acknowledged_at, 'Database contains valid acknowledged_at timestamp');
  assert(ackDbCheck.rows[0].acknowledged_by === rahulLogin.data.user.id, 'acknowledged_by references leader user ID in database');

  // 5.7 Alex queries the assignment -> Must receive ACKNOWLEDGED directly from DB
  const alexView = await request(`/assignments/${teamAssign.id}`, { token: alexToken });
  assert(alexView.data.assignment.my_submission.status === 'ACKNOWLEDGED', 'Member Alex receives ACKNOWLEDGED status from DB');
  assert(!!alexView.data.assignment.my_submission.acknowledged_at, 'Member Alex receives valid acknowledged_at timestamp');

  // 5.8 Priya queries the assignment -> Must receive ACKNOWLEDGED directly from DB
  const priyaView = await request(`/assignments/${teamAssign.id}`, { token: priyaToken });
  assert(priyaView.data.assignment.my_submission.status === 'ACKNOWLEDGED', 'Member Priya receives ACKNOWLEDGED status from DB');

  // 5.9 Professor views Submissions Monitor -> Must see ACKNOWLEDGED for Alpha Tech Innovators
  const profMonitor = await request(`/assignments/${teamAssign.id}/submissions`, { token: profToken });
  assert(profMonitor.status === 200, 'Professor retrieves Submissions Monitor data');
  const groupRow = profMonitor.data.submissions.find(s => s.group?.name === 'Alpha Tech Innovators');
  assert(!!groupRow, 'Alpha Tech Innovators group found in professor submissions monitor');
  assert(groupRow.status === 'ACKNOWLEDGED', 'Professor monitor displays ACKNOWLEDGED status for the group');

  // 5.10 Test Submission Status Filters
  const allFilter = await request(`/assignments/${teamAssign.id}/submissions?status=ALL`, { token: profToken });
  assert(allFilter.status === 200, 'Filter: ALL returns 200');

  const ackFilter = await request(`/assignments/${teamAssign.id}/submissions?status=ACKNOWLEDGED`, { token: profToken });
  assert(ackFilter.status === 200 && ackFilter.data.submissions.every(s => s.status === 'ACKNOWLEDGED'), 'Filter: ACKNOWLEDGED returns only acknowledged records');

  console.log('\n====================================================');
  console.log(`🏆 ALL ${passedTests} OF ${totalTests} QA TESTS PASSED WITH 100% SUCCESS!`);
  console.log('====================================================\n');
}

runAutonomousQA().catch(err => {
  console.error('\n💥 QA Test Runner Error:', err);
  process.exit(1);
});
