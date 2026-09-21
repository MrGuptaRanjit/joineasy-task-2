const db = require('../db/dbClient');

// POST /api/assignments/:id/submit
async function submitAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id);
    const user = req.user;
    const { submission_text, submission_url } = req.body;

    if (!submission_text && !submission_url) {
      return res.status(400).json({
        success: false,
        message: 'Please provide submission notes/content or a project repository URL.'
      });
    }

    // 1. Fetch assignment details
    const assignRes = await db.query(
      'SELECT id, course_id, title, deadline, submission_type FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.'
      });
    }

    const assignment = assignRes.rows[0];

    // 2. Verify student is enrolled in the course
    const enrollRes = await db.query(
      'SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2',
      [assignment.course_id, user.id]
    );

    if (enrollRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in the course for this assignment.'
      });
    }

    if (assignment.submission_type === 'INDIVIDUAL') {
      // Individual submission flow
      const existingSub = await db.query(
        'SELECT id, status FROM submissions WHERE assignment_id = $1 AND student_id = $2',
        [assignmentId, user.id]
      );

      let submission;
      if (existingSub.rows.length > 0) {
        // Update existing submission
        const updateRes = await db.query(
          `UPDATE submissions 
           SET submission_text = $1, 
               submission_url = $2, 
               status = 'SUBMITTED', 
               submitted_at = CURRENT_TIMESTAMP, 
               acknowledged_at = NULL, 
               acknowledged_by = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [submission_text || '', submission_url || '', existingSub.rows[0].id]
        );
        submission = updateRes.rows[0];
      } else {
        // Insert new submission
        const insertRes = await db.query(
          `INSERT INTO submissions (assignment_id, student_id, submission_text, submission_url, status, submitted_at)
           VALUES ($1, $2, $3, $4, 'SUBMITTED', CURRENT_TIMESTAMP)
           RETURNING *`,
          [assignmentId, user.id, submission_text || '', submission_url || '']
        );
        submission = insertRes.rows[0];
      }

      if (!submission) {
        const fetchSub = await db.query('SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2', [assignmentId, user.id]);
        submission = fetchSub.rows[0];
      }

      return res.status(200).json({
        success: true,
        message: 'Individual assignment submitted successfully!',
        submission
      });
    } else {
      // Group submission flow
      // Find group for this user and assignment
      const groupRes = await db.query(
        `SELECT g.id, g.name, g.leader_id
         FROM group_members gm
         JOIN groups g ON gm.group_id = g.id
         WHERE g.assignment_id = $1 AND gm.student_id = $2`,
        [assignmentId, user.id]
      );

      if (groupRes.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'You must belong to a registered group for this assignment before submitting. Please join or create a group.'
        });
      }

      const group = groupRes.rows[0];

      const existingSub = await db.query(
        'SELECT id, status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
        [assignmentId, group.id]
      );

      let submission;
      if (existingSub.rows.length > 0) {
        const updateRes = await db.query(
          `UPDATE submissions 
           SET submission_text = $1, 
               submission_url = $2, 
               status = 'SUBMITTED', 
               submitted_at = CURRENT_TIMESTAMP, 
               acknowledged_at = NULL, 
               acknowledged_by = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [submission_text || '', submission_url || '', existingSub.rows[0].id]
        );
        submission = updateRes.rows[0];
      } else {
        const insertRes = await db.query(
          `INSERT INTO submissions (assignment_id, group_id, submission_text, submission_url, status, submitted_at)
           VALUES ($1, $2, $3, $4, 'SUBMITTED', CURRENT_TIMESTAMP)
           RETURNING *`,
          [assignmentId, group.id, submission_text || '', submission_url || '']
        );
        submission = insertRes.rows[0];
      }

      if (!submission) {
        const fetchSub = await db.query('SELECT * FROM submissions WHERE assignment_id = $1 AND group_id = $2', [assignmentId, group.id]);
        submission = fetchSub.rows[0];
      }

      return res.status(200).json({
        success: true,
        message: `Group assignment submitted on behalf of group '${group.name}'!`,
        group_id: group.id,
        group_name: group.name,
        submission
      });
    }
  } catch (error) {
    next(error);
  }
}

// POST /api/submissions/:id/acknowledge
// CRITICAL: Strict role and leader authorization enforcement
async function acknowledgeSubmission(req, res, next) {
  try {
    const submissionId = parseInt(req.params.id);
    const user = req.user;

    // 1. Fetch submission with assignment and group details
    const subRes = await db.query(
      `SELECT s.*, 
              a.submission_type, a.course_id, a.title as assignment_title,
              c.professor_id,
              g.name as group_name, g.leader_id as group_leader_id,
              u_lead.name as leader_name, u_lead.email as leader_email
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       LEFT JOIN groups g ON s.group_id = g.id
       LEFT JOIN users u_lead ON g.leader_id = u_lead.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission record not found.'
      });
    }

    const sub = subRes.rows[0];

    if (sub.status === 'ACKNOWLEDGED') {
      return res.status(200).json({
        success: true,
        message: 'Submission has already been acknowledged.',
        submission: sub
      });
    }

    // 2. Enforce authorization rules
    if (sub.submission_type === 'GROUP') {
      if (!sub.group_id) {
        return res.status(400).json({
          success: false,
          message: 'Group submission data is missing a valid group reference.'
        });
      }

      // Check if user is a member of this group
      const memberCheck = await db.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND student_id = $2',
        [sub.group_id, user.id]
      );

      if (user.role !== 'PROFESSOR' && memberCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not belong to this group.'
        });
      }

      // CRITICAL: Only the GROUP LEADER can acknowledge
      if (user.role !== 'PROFESSOR' && user.id !== sub.group_leader_id) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Only the group leader (${sub.leader_name}) has the authority to acknowledge this submission.`
        });
      }
    } else {
      // Individual submission: only the student who submitted or the course professor can acknowledge
      if (user.role !== 'PROFESSOR' && user.id !== sub.student_id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to acknowledge this submission.'
        });
      }
    }

    // 3. Update acknowledgment in database
    await db.query(
      `UPDATE submissions 
       SET status = 'ACKNOWLEDGED', 
           acknowledged_at = CURRENT_TIMESTAMP, 
           acknowledged_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [user.id, submissionId]
    );

    const updatedRes = await db.query(
      `SELECT s.*, 
              u_ack.name as acknowledged_by_name,
              g.name as group_name, g.leader_id as group_leader_id
       FROM submissions s
       LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
       LEFT JOIN groups g ON s.group_id = g.id
       WHERE s.id = $1`,
      [submissionId]
    );

    const updatedSubmission = updatedRes.rows[0];

    return res.status(200).json({
      success: true,
      message: sub.submission_type === 'GROUP'
        ? `Group submission acknowledged by Leader ${user.name}. All members now have Acknowledged status!`
        : 'Submission acknowledged successfully!',
      submission: updatedSubmission
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/assignments/:id/submissions (Professor Monitoring)
async function getAssignmentSubmissions(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id);
    const { status } = req.query;

    // Fetch assignment
    const assignRes = await db.query(
      `SELECT a.*, c.code as course_code, c.name as course_name, c.professor_id
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = $1`,
      [assignmentId]
    );

    if (assignRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.'
      });
    }

    const assignment = assignRes.rows[0];

    // Fetch enrolled students
    const enrolledStudentsRes = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_url
       FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       WHERE ce.course_id = $1
       ORDER BY u.name ASC`,
      [assignment.course_id]
    );
    const enrolledStudents = enrolledStudentsRes.rows;

    let items = [];

    if (assignment.submission_type === 'INDIVIDUAL') {
      // For each enrolled student, fetch their submission if exists
      for (const student of enrolledStudents) {
        const subRes = await db.query(
          `SELECT s.*, u_ack.name as acknowledged_by_name
           FROM submissions s
           LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
           WHERE s.assignment_id = $1 AND s.student_id = $2`,
          [assignmentId, student.id]
        );
        const sub = subRes.rows[0] || null;
        const isOverdue = !sub && new Date(assignment.deadline) < new Date();
        const computedStatus = sub ? sub.status : (isOverdue ? 'OVERDUE' : 'PENDING');

        items.push({
          id: student.id,
          type: 'INDIVIDUAL',
          student: student,
          submission: sub,
          status: computedStatus,
          submitted_at: sub ? sub.submitted_at : null,
          acknowledged_at: sub ? sub.acknowledged_at : null,
          acknowledged_by_name: sub ? sub.acknowledged_by_name : null,
          submission_url: sub ? sub.submission_url : null,
          submission_text: sub ? sub.submission_text : null,
          grade: sub ? sub.grade : null,
          feedback: sub ? sub.feedback : null
        });
      }
    } else {
      // Group assignment: list registered groups and their submissions
      const groupsRes = await db.query(
        `SELECT g.id, g.name, g.leader_id, 
                u_lead.name as leader_name, u_lead.email as leader_email, u_lead.avatar_url as leader_avatar
         FROM groups g
         JOIN users u_lead ON g.leader_id = u_lead.id
         WHERE g.assignment_id = $1
         ORDER BY g.name ASC`,
        [assignmentId]
      );

      for (const group of groupsRes.rows) {
        const membersRes = await db.query(
          `SELECT u.id, u.name, u.email, u.avatar_url
           FROM group_members gm
           JOIN users u ON gm.student_id = u.id
           WHERE gm.group_id = $1
           ORDER BY u.name ASC`,
          [group.id]
        );

        const subRes = await db.query(
          `SELECT s.*, u_ack.name as acknowledged_by_name
           FROM submissions s
           LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
           WHERE s.assignment_id = $1 AND s.group_id = $2`,
          [assignmentId, group.id]
        );

        const sub = subRes.rows[0] || null;
        const isOverdue = !sub && new Date(assignment.deadline) < new Date();
        const computedStatus = sub ? sub.status : (isOverdue ? 'OVERDUE' : 'PENDING');

        items.push({
          id: group.id,
          type: 'GROUP',
          group: {
            id: group.id,
            name: group.name,
            leader_id: group.leader_id,
            leader_name: group.leader_name,
            leader_email: group.leader_email,
            leader_avatar: group.leader_avatar,
            members: membersRes.rows
          },
          submission: sub,
          status: computedStatus,
          submitted_at: sub ? sub.submitted_at : null,
          acknowledged_at: sub ? sub.acknowledged_at : null,
          acknowledged_by_name: sub ? sub.acknowledged_by_name : null,
          submission_url: sub ? sub.submission_url : null,
          submission_text: sub ? sub.submission_text : null,
          grade: sub ? sub.grade : null,
          feedback: sub ? sub.feedback : null
        });
      }
    }

    // Calculate Summary Statistics
    const totalEntities = items.length;
    const submittedCount = items.filter(i => i.status === 'SUBMITTED' || i.status === 'ACKNOWLEDGED').length;
    const acknowledgedCount = items.filter(i => i.status === 'ACKNOWLEDGED').length;
    const pendingCount = items.filter(i => i.status === 'PENDING').length;
    const overdueCount = items.filter(i => i.status === 'OVERDUE').length;
    const submissionRate = totalEntities > 0 ? Math.round((submittedCount / totalEntities) * 100) : 0;

    // Filter items if status filter provided
    let filteredItems = items;
    if (status && status !== 'ALL') {
      filteredItems = items.filter(i => i.status.toUpperCase() === status.toUpperCase());
    }

    return res.status(200).json({
      success: true,
      assignment,
      statistics: {
        total_entities: totalEntities,
        submitted_count: submittedCount,
        acknowledged_count: acknowledgedCount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
        submission_rate: submissionRate
      },
      submissions: filteredItems
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/submissions/:id/grade (Professor only)
async function gradeSubmission(req, res, next) {
  try {
    const submissionId = parseInt(req.params.id);
    const { grade, feedback } = req.body;

    if (grade === undefined || grade === null) {
      return res.status(400).json({
        success: false,
        message: 'Grade is required.'
      });
    }

    const numGrade = parseInt(grade);
    if (isNaN(numGrade) || numGrade < 0) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be a valid positive number.'
      });
    }

    await db.query(
      `UPDATE submissions 
       SET grade = $1, feedback = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [numGrade, feedback || '', submissionId]
    );

    const updated = await db.query('SELECT * FROM submissions WHERE id = $1', [submissionId]);

    return res.status(200).json({
      success: true,
      message: 'Submission graded successfully.',
      submission: updated.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitAssignment,
  acknowledgeSubmission,
  getAssignmentSubmissions,
  gradeSubmission
};
