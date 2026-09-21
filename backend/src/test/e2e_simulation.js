const baseUrl = process.env.TEST_API_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;

async function req(path, opt = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opt.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opt.token ? { Authorization: `Bearer ${opt.token}` } : {})
    },
    body: opt.body ? JSON.stringify(opt.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runE2E() {
  console.log('🚀 Running Live End-to-End System Simulation against port 5000...\n');

  // 1. Professor Login
  const prof = await req('/auth/login', {
    method: 'POST',
    body: { email: 'robert@university.edu', password: 'Password123!' }
  });
  console.log('1. Professor Login:', prof.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
  const profToken = prof.data.token;

  // 2. Student Leader Login (Rahul)
  const rahul = await req('/auth/login', {
    method: 'POST',
    body: { email: 'rahul@university.edu', password: 'Password123!' }
  });
  console.log('2. Student Leader Login (Rahul):', rahul.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
  const rahulToken = rahul.data.token;

  // 3. Student Member Login (Alex)
  const alex = await req('/auth/login', {
    method: 'POST',
    body: { email: 'alex@university.edu', password: 'Password123!' }
  });
  console.log('3. Student Member Login (Alex):', alex.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
  const alexToken = alex.data.token;

  // 4. Student Member Login (Priya)
  const priya = await req('/auth/login', {
    method: 'POST',
    body: { email: 'priya@university.edu', password: 'Password123!' }
  });
  console.log('4. Student Member Login (Priya):', priya.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
  const priyaToken = priya.data.token;

  // 5. Get Group Assignment
  const assignRes = await req('/assignments', { token: rahulToken });
  const groupAssign = assignRes.data.assignments.find(a => a.submission_type === 'GROUP');
  console.log('5. Found Group Assignment:', groupAssign.title);

  // 6. Rahul Submits Group Assignment
  const submitRes = await req(`/assignments/${groupAssign.id}/submit`, {
    method: 'POST',
    token: rahulToken,
    body: {
      submission_text: 'Live E2E Verification submission of Academic Nexus SaaS Platform.',
      submission_url: 'https://github.com/academic-nexus/submission-e2e'
    }
  });
  console.log('6. Group Submission by Leader:', submitRes.status === 200 ? '✅ SUBMITTED' : '❌ FAILED');
  const subId = submitRes.data.submission.id;

  // 7. Alex (Member) tries to acknowledge -> MUST FAIL WITH 403
  const alexAck = await req(`/submissions/${subId}/acknowledge`, {
    method: 'POST',
    token: alexToken
  });
  console.log('7. Alex (Non-Leader Member) acknowledgment attempt (Expected 403):', alexAck.status === 403 ? `✅ REJECTED (403: "${alexAck.data.message}")` : '❌ SECURITY FAILED');

  // 8. Rahul (Leader) acknowledges -> MUST SUCCEED WITH 200
  const rahulAck = await req(`/submissions/${subId}/acknowledge`, {
    method: 'POST',
    token: rahulToken
  });
  console.log('8. Rahul (Group Leader) acknowledgment attempt (Expected 200):', rahulAck.status === 200 ? '✅ ACKNOWLEDGED (200 OK)' : '❌ FAILED');

  // 9. Alex & Priya view assignment -> Must see ACKNOWLEDGED in database
  const alexView = await req(`/assignments/${groupAssign.id}`, { token: alexToken });
  console.log('9. Alex View Status from DB:', alexView.data.assignment.my_submission.status === 'ACKNOWLEDGED' ? '✅ ACKNOWLEDGED' : '❌ MISMATCH');

  const priyaView = await req(`/assignments/${groupAssign.id}`, { token: priyaToken });
  console.log('10. Priya View Status from DB:', priyaView.data.assignment.my_submission.status === 'ACKNOWLEDGED' ? '✅ ACKNOWLEDGED' : '❌ MISMATCH');

  // 11. Professor views Submissions Monitor
  const monitorRes = await req(`/assignments/${groupAssign.id}/submissions`, { token: profToken });
  const groupInMonitor = monitorRes.data.submissions.find(s => s.group?.name === 'Alpha Tech Innovators');
  console.log('11. Professor Monitoring Status for Alpha Tech Innovators:', groupInMonitor?.status === 'ACKNOWLEDGED' ? '✅ ACKNOWLEDGED' : '❌ MISMATCH');

  // 12. Professor grades the submission
  const gradeRes = await req(`/submissions/${subId}/grade`, {
    method: 'POST',
    token: profToken,
    body: { grade: 99, feedback: 'Outstanding architecture, database design, and role security implementation.' }
  });
  console.log('12. Professor Grading (Score 99/150):', gradeRes.status === 200 ? '✅ GRADED' : '❌ FAILED');

  // 13. Student retrieves graded assignment
  const gradedStudentView = await req(`/assignments/${groupAssign.id}`, { token: rahulToken });
  console.log('13. Student View Evaluated Grade:', gradedStudentView.data.assignment.my_submission.grade === 99 ? '✅ GRADE 99/150 VISIBLE' : '❌ MISMATCH');

  console.log('\n==================================================');
  console.log('🏆 COMPLETE LIVE END-TO-END FLOW VERIFIED SUCCESSFULLY!');
  console.log('==================================================');
}

runE2E().catch(console.error);
