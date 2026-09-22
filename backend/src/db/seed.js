const bcrypt = require('bcryptjs');
const db = require('./dbClient');
const env = require('../config/env');

async function seed() {
  console.log('🌱 Starting database seeding...');
  
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required to run seed.');
  }

  const pool = await db.initDb();
  if (!pool) {
    throw new Error('Seeding failed: Unable to establish connection to PostgreSQL.');
  }

  // Clear existing tables in reverse dependency order
  const clearQueries = [
    'DELETE FROM submissions',
    'DELETE FROM group_members',
    'DELETE FROM groups',
    'DELETE FROM assignments',
    'DELETE FROM course_enrollments',
    'DELETE FROM courses',
    'DELETE FROM users'
  ];

  for (const q of clearQueries) {
    try {
      await db.query(q);
    } catch (e) {
      // Table may not exist or be empty yet
    }
  }

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Insert Users
  console.log('👤 Seeding Users...');
  const usersToInsert = [
    {
      name: 'Dr. Robert Davis',
      email: 'robert@university.edu',
      role: 'PROFESSOR',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Prof. Elena Vance',
      email: 'elena@university.edu',
      role: 'PROFESSOR',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Rahul Sharma (Leader)',
      email: 'rahul@university.edu',
      role: 'STUDENT',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Alex Chen (Member)',
      email: 'alex@university.edu',
      role: 'STUDENT',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Priya Patel (Member)',
      email: 'priya@university.edu',
      role: 'STUDENT',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Marcus Brown (Student)',
      email: 'marcus@university.edu',
      role: 'STUDENT',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const userIds = {};
  for (const u of usersToInsert) {
    const res = await db.query(
      `INSERT INTO users (name, email, password_hash, role, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [u.name, u.email, defaultPasswordHash, u.role, u.avatar]
    );
    userIds[u.email] = res.rows[0]?.id;
  }

  // 2. Insert Courses
  console.log('📚 Seeding Courses...');
  const coursesToInsert = [
    {
      code: 'CS-301',
      name: 'Advanced Full Stack Web Development',
      description: 'Comprehensive study of modern full-stack web applications, React architecture, Node microservices, and relational schema modeling.',
      semester: 'Fall 2026',
      professor_id: userIds['robert@university.edu']
    },
    {
      code: 'CS-305',
      name: 'Cloud Native Systems & Distributed Architecture',
      description: 'Design and deployment of containerized cloud workloads, Docker, Kubernetes, and event-driven architectures.',
      semester: 'Fall 2026',
      professor_id: userIds['elena@university.edu']
    },
    {
      code: 'CS-402',
      name: 'Database Architecture & Concurrency Optimization',
      description: 'Deep dive into transactional ACID guarantees, indexing strategies, PostgreSQL query planning, and replication models.',
      semester: 'Fall 2026',
      professor_id: userIds['robert@university.edu']
    }
  ];

  const courseIds = {};
  for (const c of coursesToInsert) {
    const res = await db.query(
      `INSERT INTO courses (code, name, description, semester, professor_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [c.code, c.name, c.description, c.semester, c.professor_id]
    );
    courseIds[c.code] = res.rows[0]?.id;
  }

  // 3. Insert Enrollments
  console.log('🎓 Seeding Course Enrollments...');
  const studentEmails = ['rahul@university.edu', 'alex@university.edu', 'priya@university.edu', 'marcus@university.edu'];
  
  for (const sEmail of studentEmails) {
    const sId = userIds[sEmail];
    await db.query(`INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2)`, [courseIds['CS-301'], sId]);
    await db.query(`INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2)`, [courseIds['CS-305'], sId]);
  }
  await db.query(`INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2)`, [courseIds['CS-402'], userIds['rahul@university.edu']]);
  await db.query(`INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2)`, [courseIds['CS-402'], userIds['marcus@university.edu']]);

  // 4. Insert Assignments
  console.log('📝 Seeding Assignments...');
  const assignmentsToInsert = [
    {
      key: 'A1',
      course_id: courseIds['CS-301'],
      title: 'Individual Milestone: REST API & JWT Auth Microservice',
      description: 'Build a fully secured Node.js + Express backend with JWT role validation, bcrypt password hashing, and comprehensive unit tests.',
      deadline: '2026-09-30 23:59:59',
      submission_type: 'INDIVIDUAL',
      max_score: 100,
      created_by: userIds['robert@university.edu']
    },
    {
      key: 'A2',
      course_id: courseIds['CS-301'],
      title: 'Team Project: Collaborative Academic SaaS Platform',
      description: 'Design and implement a multi-user academic SaaS platform with React frontend, PostgreSQL database, and group leader acknowledgment verification.',
      deadline: '2026-10-15 23:59:59',
      submission_type: 'GROUP',
      max_score: 150,
      created_by: userIds['robert@university.edu']
    },
    {
      key: 'A3',
      course_id: courseIds['CS-305'],
      title: 'Distributed System: Kubernetes Auto-scaling & Monitoring',
      description: 'Configure and test an auto-scaling multi-pod deployment with Prometheus and Grafana metrics dashboards.',
      deadline: '2026-10-20 23:59:59',
      submission_type: 'GROUP',
      max_score: 100,
      created_by: userIds['elena@university.edu']
    },
    {
      key: 'A4',
      course_id: courseIds['CS-402'],
      title: 'Database Optimization: B-Tree Indexing & Query Plans',
      description: 'Analyze EXPLAIN ANALYZE execution trees for million-row benchmark tables and propose optimal multi-column composite indices.',
      deadline: '2026-09-28 23:59:59',
      submission_type: 'INDIVIDUAL',
      max_score: 100,
      created_by: userIds['robert@university.edu']
    }
  ];

  const assignmentIds = {};
  for (const a of assignmentsToInsert) {
    const res = await db.query(
      `INSERT INTO assignments (course_id, title, description, deadline, submission_type, max_score, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [a.course_id, a.title, a.description, a.deadline, a.submission_type, a.max_score, a.created_by]
    );
    assignmentIds[a.key] = res.rows[0]?.id;
  }

  // 5. Insert Groups & Group Members
  console.log('👥 Seeding Groups & Members...');
  
  // Group 1 for Assignment 2 (CS-301 Team Project)
  // Leader: Rahul Sharma, Members: Alex Chen, Priya Patel
  const g1Res = await db.query(
    `INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING id`,
    [assignmentIds['A2'], 'Alpha Tech Innovators', userIds['rahul@university.edu']]
  );
  const group1Id = g1Res.rows[0]?.id;

  // Add members
  await db.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [group1Id, userIds['rahul@university.edu']]);
  await db.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [group1Id, userIds['alex@university.edu']]);
  await db.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [group1Id, userIds['priya@university.edu']]);

  // Group 2 for Assignment 3 (CS-305)
  // Leader: Marcus Brown, Member: Alex Chen
  const g2Res = await db.query(
    `INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING id`,
    [assignmentIds['A3'], 'Cloud Architects', userIds['marcus@university.edu']]
  );
  const group2Id = g2Res.rows[0]?.id;
  await db.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [group2Id, userIds['marcus@university.edu']]);
  await db.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [group2Id, userIds['alex@university.edu']]);

  // 6. Insert Submissions
  console.log('🚀 Seeding Initial Submissions...');

  // Marcus submitted Assignment 1 (Individual) -> Acknowledged
  await db.query(
    `INSERT INTO submissions (assignment_id, student_id, submission_text, submission_url, status, submitted_at, acknowledged_at, acknowledged_by, grade, feedback)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      assignmentIds['A1'],
      userIds['marcus@university.edu'],
      'Completed microservice authentication implementation with JWT refresh token rotation.',
      'https://github.com/marcus-brown/auth-microservice-demo',
      'ACKNOWLEDGED',
      '2026-09-20 10:30:00',
      '2026-09-20 14:15:00',
      userIds['marcus@university.edu'],
      96,
      'Excellent code quality and test coverage!'
    ]
  );

  // Priya submitted Assignment 1 (Individual) -> Submitted (Pending acknowledgment)
  await db.query(
    `INSERT INTO submissions (assignment_id, student_id, submission_text, submission_url, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      assignmentIds['A1'],
      userIds['priya@university.edu'],
      'REST API and JWT endpoints tested with Postman collection and Docker compose.',
      'https://github.com/priya-patel/express-auth-service',
      'SUBMITTED',
      '2026-09-21 09:00:00'
    ]
  );

  // Group 1 (Alpha Tech Innovators: Rahul, Alex, Priya) submitted Assignment 2 (Group) -> SUBMITTED (Ready for leader Rahul to acknowledge!)
  await db.query(
    `INSERT INTO submissions (assignment_id, group_id, submission_text, submission_url, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      assignmentIds['A2'],
      group1Id,
      'Academic Nexus full-stack submission. Includes React UI, PostgreSQL relational tables, and leader acknowledgment verification.',
      'https://github.com/alpha-tech/academic-nexus-platform',
      'SUBMITTED',
      '2026-09-21 11:30:00'
    ]
  );

  console.log('✨ Database successfully seeded!');
}

if (require.main === module) {
  seed().then(async () => {
    await db.closeDb();
    process.exit(0);
  }).catch(async (err) => {
    console.error('❌ Seeding failed:', err);
    await db.closeDb();
    process.exit(1);
  });
}

module.exports = seed;
