const db = require('../db/dbClient');

// GET /api/courses
async function getCourses(req, res, next) {
  try {
    const user = req.user;

    if (user.role === 'PROFESSOR') {
      // Courses taught by this professor with student & assignment metrics
      const coursesQuery = `
        SELECT 
          c.id, c.code, c.name, c.description, c.semester, c.created_at,
          u.name as professor_name, u.email as professor_email,
          COUNT(DISTINCT ce.student_id) as enrolled_students_count,
          COUNT(DISTINCT a.id) as assignments_count
        FROM courses c
        JOIN users u ON c.professor_id = u.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        LEFT JOIN assignments a ON c.id = a.course_id
        WHERE c.professor_id = $1
        GROUP BY c.id, c.code, c.name, c.description, c.semester, c.created_at, u.name, u.email
        ORDER BY c.created_at DESC
      `;
      const result = await db.query(coursesQuery, [user.id]);

      // Calculate submission stats for each course
      const coursesWithStats = await Promise.all(
        result.rows.map(async (course) => {
          const subQuery = `
            SELECT 
              COUNT(DISTINCT s.id) as total_submissions,
              COUNT(DISTINCT CASE WHEN s.status = 'ACKNOWLEDGED' THEN s.id END) as acknowledged_submissions
            FROM assignments a
            JOIN submissions s ON a.id = s.assignment_id
            WHERE a.course_id = $1
          `;
          const subRes = await db.query(subQuery, [course.id]);
          const subData = subRes.rows[0] || { total_submissions: 0, acknowledged_submissions: 0 };
          return {
            ...course,
            enrolled_students_count: parseInt(course.enrolled_students_count || 0),
            assignments_count: parseInt(course.assignments_count || 0),
            total_submissions: parseInt(subData.total_submissions || 0),
            acknowledged_submissions: parseInt(subData.acknowledged_submissions || 0)
          };
        })
      );

      return res.status(200).json({
        success: true,
        courses: coursesWithStats
      });
    } else {
      // For student: list enrolled courses with assignments count and student's submission progress
      const studentCoursesQuery = `
        SELECT 
          c.id, c.code, c.name, c.description, c.semester, c.created_at,
          u.name as professor_name, u.email as professor_email,
          COUNT(DISTINCT a.id) as assignments_count
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        JOIN users u ON c.professor_id = u.id
        LEFT JOIN assignments a ON c.id = a.course_id
        WHERE ce.student_id = $1
        GROUP BY c.id, c.code, c.name, c.description, c.semester, c.created_at, u.name, u.email
        ORDER BY c.code ASC
      `;
      const result = await db.query(studentCoursesQuery, [user.id]);

      // Enrich with student's completed assignments for each course
      const coursesWithStudentStats = await Promise.all(
        result.rows.map(async (course) => {
          // Check upcoming assignment deadline
          const upcomingQuery = `
            SELECT deadline, title 
            FROM assignments 
            WHERE course_id = $1 
            ORDER BY deadline ASC 
            LIMIT 1
          `;
          const upcomingRes = await db.query(upcomingQuery, [course.id]);

          // Check how many assignments the student has submitted or acknowledged
          const studentSubQuery = `
            SELECT 
              COUNT(DISTINCT s.id) as submitted_count,
              COUNT(DISTINCT CASE WHEN s.status = 'ACKNOWLEDGED' THEN s.id END) as acknowledged_count
            FROM assignments a
            JOIN submissions s ON a.id = s.assignment_id
            WHERE a.course_id = $1 
              AND (
                s.student_id = $2 
                OR s.group_id IN (
                  SELECT group_id FROM group_members WHERE student_id = $2
                )
              )
          `;
          const subRes = await db.query(studentSubQuery, [course.id, user.id]);
          const subData = subRes.rows[0] || { submitted_count: 0, acknowledged_count: 0 };
          const assignmentsCount = parseInt(course.assignments_count || 0);
          const submittedCount = parseInt(subData.submitted_count || 0);
          const acknowledgedCount = parseInt(subData.acknowledged_count || 0);

          const progressPercent = assignmentsCount > 0 
            ? Math.round((submittedCount / assignmentsCount) * 100) 
            : 0;

          return {
            ...course,
            assignments_count: assignmentsCount,
            submitted_count: submittedCount,
            acknowledged_count: acknowledgedCount,
            progress_percent: progressPercent,
            upcoming_deadline: upcomingRes.rows[0]?.deadline || null,
            upcoming_assignment_title: upcomingRes.rows[0]?.title || null
          };
        })
      );

      return res.status(200).json({
        success: true,
        courses: coursesWithStudentStats
      });
    }
  } catch (error) {
    next(error);
  }
}

// GET /api/courses/:id
async function getCourseById(req, res, next) {
  try {
    const courseId = parseInt(req.params.id);
    const user = req.user;

    const courseQuery = `
      SELECT 
        c.id, c.code, c.name, c.description, c.semester, c.professor_id, c.created_at,
        u.name as professor_name, u.email as professor_email, u.avatar_url as professor_avatar
      FROM courses c
      JOIN users u ON c.professor_id = u.id
      WHERE c.id = $1
    `;
    const courseRes = await db.query(courseQuery, [courseId]);

    if (courseRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    const course = courseRes.rows[0];

    // Get assignments for this course
    const assignmentsQuery = `
      SELECT 
        a.id, a.course_id, a.title, a.description, a.deadline, a.submission_type, a.max_score, a.created_at
      FROM assignments a
      WHERE a.course_id = $1
      ORDER BY a.deadline ASC
    `;
    const assignmentsRes = await db.query(assignmentsQuery, [courseId]);

    // Attach student submission status for each assignment if requester is student
    let assignmentsWithStatus = assignmentsRes.rows;
    if (user.role === 'STUDENT') {
      assignmentsWithStatus = await Promise.all(
        assignmentsRes.rows.map(async (assign) => {
          const subQuery = `
            SELECT 
              s.id as submission_id, s.status, s.submitted_at, s.acknowledged_at,
              g.id as group_id, g.name as group_name, g.leader_id as group_leader_id
            FROM submissions s
            LEFT JOIN groups g ON s.group_id = g.id
            WHERE s.assignment_id = $1
              AND (
                s.student_id = $2
                OR s.group_id IN (SELECT group_id FROM group_members WHERE student_id = $2)
              )
            LIMIT 1
          `;
          const subRes = await db.query(subQuery, [assign.id, user.id]);
          const submission = subRes.rows[0] || null;

          // Check if assignment deadline has passed
          const isOverdue = !submission && new Date(assign.deadline) < new Date();

          return {
            ...assign,
            submission_status: submission ? submission.status : (isOverdue ? 'OVERDUE' : 'PENDING'),
            my_submission: submission
          };
        })
      );
    } else {
      // If Professor: attach total submissions summary
      assignmentsWithStatus = await Promise.all(
        assignmentsRes.rows.map(async (assign) => {
          const countsQuery = `
            SELECT 
              COUNT(DISTINCT s.id) as total_submissions,
              COUNT(DISTINCT CASE WHEN s.status = 'ACKNOWLEDGED' THEN s.id END) as acknowledged_count
            FROM submissions s
            WHERE s.assignment_id = $1
          `;
          const countRes = await db.query(countsQuery, [assign.id]);
          const counts = countRes.rows[0] || { total_submissions: 0, acknowledged_count: 0 };
          return {
            ...assign,
            total_submissions: parseInt(counts.total_submissions || 0),
            acknowledged_count: parseInt(counts.acknowledged_count || 0)
          };
        })
      );
    }

    // Get enrolled students
    const studentsQuery = `
      SELECT u.id, u.name, u.email, u.avatar_url, ce.enrolled_at
      FROM course_enrollments ce
      JOIN users u ON ce.student_id = u.id
      WHERE ce.course_id = $1
      ORDER BY u.name ASC
    `;
    const studentsRes = await db.query(studentsQuery, [courseId]);

    return res.status(200).json({
      success: true,
      course: {
        ...course,
        assignments: assignmentsWithStatus,
        students: studentsRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/courses (Professor only)
async function createCourse(req, res, next) {
  try {
    const { code, name, description, semester } = req.body;
    const professorId = req.user.id;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Course code and name are required.'
      });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check unique course code
    const existing = await db.query('SELECT id FROM courses WHERE code = $1', [cleanCode]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A course with code ${cleanCode} already exists.`
      });
    }

    const insertRes = await db.query(
      `INSERT INTO courses (code, name, description, semester, professor_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cleanCode, name.trim(), description || '', semester || 'Fall 2026', professorId]
    );

    let newCourse = insertRes.rows[0];
    if (!newCourse) {
      const fetch = await db.query('SELECT * FROM courses WHERE code = $1', [cleanCode]);
      newCourse = fetch.rows[0];
    }

    return res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      course: newCourse
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/courses/:id/enroll (Student only)
async function enrollCourse(req, res, next) {
  try {
    const courseId = parseInt(req.params.id);
    const studentId = req.user.id;

    const courseCheck = await db.query('SELECT id, name FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    const existingEnroll = await db.query(
      'SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2',
      [courseId, studentId]
    );

    if (existingEnroll.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course.'
      });
    }

    await db.query(
      'INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2)',
      [courseId, studentId]
    );

    return res.status(200).json({
      success: true,
      message: 'Successfully enrolled in course.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  enrollCourse
};
