const db = require('../db/dbClient');

// GET /api/assignments
async function getAssignments(req, res, next) {
  try {
    const user = req.user;
    const { courseId, submissionType } = req.query;

    let query = `
      SELECT 
        a.id, a.course_id, a.title, a.description, a.deadline, a.submission_type, a.max_score, a.created_at,
        c.code as course_code, c.name as course_name,
        u.name as professor_name
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (courseId) {
      params.push(parseInt(courseId));
      query += ` AND a.course_id = $${params.length}`;
    }

    if (submissionType) {
      params.push(submissionType.toUpperCase());
      query += ` AND a.submission_type = $${params.length}`;
    }

    if (user.role === 'PROFESSOR') {
      // Professors see assignments for courses they teach
      params.push(user.id);
      query += ` AND c.professor_id = $${params.length}`;
    } else {
      // Students see assignments for courses they are enrolled in
      params.push(user.id);
      query += ` AND c.id IN (SELECT course_id FROM course_enrollments WHERE student_id = $${params.length})`;
    }

    query += ` ORDER BY a.deadline ASC`;

    const result = await db.query(query, params);

    // If student, enrich with individual/group submission status
    let assignments = result.rows;
    if (user.role === 'STUDENT') {
      assignments = await Promise.all(
        result.rows.map(async (assign) => {
          const subRes = await db.query(
            `SELECT s.id, s.status, s.submitted_at, s.acknowledged_at
             FROM submissions s
             WHERE s.assignment_id = $1
               AND (
                 s.student_id = $2
                 OR s.group_id IN (SELECT group_id FROM group_members WHERE student_id = $2)
               )
             LIMIT 1`,
            [assign.id, user.id]
          );
          const sub = subRes.rows[0];
          const isOverdue = !sub && new Date(assign.deadline) < new Date();
          return {
            ...assign,
            submission_status: sub ? sub.status : (isOverdue ? 'OVERDUE' : 'PENDING'),
            my_submission: sub || null
          };
        })
      );
    } else {
      // For professor: attach counts
      assignments = await Promise.all(
        result.rows.map(async (assign) => {
          const statsRes = await db.query(
            `SELECT 
               COUNT(DISTINCT s.id) as total_submissions,
               COUNT(DISTINCT CASE WHEN s.status = 'ACKNOWLEDGED' THEN s.id END) as acknowledged_count
             FROM submissions s
             WHERE s.assignment_id = $1`,
            [assign.id]
          );
          const stats = statsRes.rows[0] || { total_submissions: 0, acknowledged_count: 0 };
          return {
            ...assign,
            total_submissions: parseInt(stats.total_submissions || 0),
            acknowledged_count: parseInt(stats.acknowledged_count || 0)
          };
        })
      );
    }

    return res.status(200).json({
      success: true,
      assignments
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/assignments/:id
async function getAssignmentById(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id);
    const user = req.user;

    const assignQuery = `
      SELECT 
        a.id, a.course_id, a.title, a.description, a.deadline, a.submission_type, a.max_score, a.created_by, a.created_at,
        c.code as course_code, c.name as course_name, c.professor_id,
        u.name as professor_name, u.email as professor_email, u.avatar_url as professor_avatar
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON a.created_by = u.id
      WHERE a.id = $1
    `;
    const assignRes = await db.query(assignQuery, [assignmentId]);

    if (assignRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.'
      });
    }

    const assignment = assignRes.rows[0];

    // Fetch group details if applicable
    let userGroup = null;
    let assignmentGroups = [];

    if (assignment.submission_type === 'GROUP') {
      const groupsRes = await db.query(
        `SELECT g.id, g.name, g.leader_id, u.name as leader_name, u.email as leader_email, u.avatar_url as leader_avatar
         FROM groups g
         JOIN users u ON g.leader_id = u.id
         WHERE g.assignment_id = $1`,
        [assignmentId]
      );

      assignmentGroups = await Promise.all(
        groupsRes.rows.map(async (group) => {
          const membersRes = await db.query(
            `SELECT u.id, u.name, u.email, u.avatar_url, gm.joined_at
             FROM group_members gm
             JOIN users u ON gm.student_id = u.id
             WHERE gm.group_id = $1
             ORDER BY u.name ASC`,
            [group.id]
          );
          return {
            ...group,
            is_user_leader: group.leader_id === user.id,
            members: membersRes.rows
          };
        })
      );

      if (user.role === 'STUDENT') {
        userGroup = assignmentGroups.find(g =>
          g.leader_id === user.id || g.members.some(m => m.id === user.id)
        ) || null;
      }
    }

    // Fetch user submission
    let userSubmission = null;
    if (user.role === 'STUDENT') {
      let subQuery;
      let subParams;
      if (assignment.submission_type === 'GROUP' && userGroup) {
        subQuery = `
          SELECT s.*, 
                 g.name as group_name, g.leader_id as group_leader_id,
                 u_ack.name as acknowledged_by_name
          FROM submissions s
          LEFT JOIN groups g ON s.group_id = g.id
          LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
          WHERE s.assignment_id = $1 AND s.group_id = $2
        `;
        subParams = [assignmentId, userGroup.id];
      } else {
        subQuery = `
          SELECT s.*,
                 u_ack.name as acknowledged_by_name
          FROM submissions s
          LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
          WHERE s.assignment_id = $1 AND s.student_id = $2
        `;
        subParams = [assignmentId, user.id];
      }

      const subRes = await db.query(subQuery, subParams);
      userSubmission = subRes.rows[0] || null;
    }

    return res.status(200).json({
      success: true,
      assignment: {
        ...assignment,
        groups: assignmentGroups,
        user_group: userGroup,
        my_submission: userSubmission
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/assignments (Professor only)
async function createAssignment(req, res, next) {
  try {
    const { course_id, title, description, deadline, submission_type, max_score, groups } = req.body;
    const userId = req.user.id;

    if (!course_id || !title || !description || !deadline || !submission_type) {
      return res.status(400).json({
        success: false,
        message: 'Course, title, description, deadline, and submission type are required.'
      });
    }

    const normType = submission_type.toUpperCase();
    if (!['INDIVIDUAL', 'GROUP'].includes(normType)) {
      return res.status(400).json({
        success: false,
        message: 'Submission type must be INDIVIDUAL or GROUP.'
      });
    }

    // Verify professor owns the course
    const courseRes = await db.query(
      'SELECT id, professor_id FROM courses WHERE id = $1',
      [parseInt(course_id)]
    );

    if (courseRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    if (courseRes.rows[0].professor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only create assignments for courses you teach.'
      });
    }

    const insertRes = await db.query(
      `INSERT INTO assignments (course_id, title, description, deadline, submission_type, max_score, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        parseInt(course_id),
        title.trim(),
        description.trim(),
        new Date(deadline).toISOString(),
        normType,
        parseInt(max_score) || 100,
        userId
      ]
    );

    let newAssignment = insertRes.rows[0];
    if (!newAssignment) {
      const fetch = await db.query('SELECT * FROM assignments WHERE title = $1 ORDER BY id DESC LIMIT 1', [title.trim()]);
      newAssignment = fetch.rows[0];
    }

    // If group assignment and groups are provided in payload or auto-grouping requested
    if (normType === 'GROUP' && Array.isArray(groups) && groups.length > 0) {
      for (const grp of groups) {
        if (grp.name && grp.leader_id) {
          const grpInsert = await db.query(
            `INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING id`,
            [newAssignment.id, grp.name.trim(), parseInt(grp.leader_id)]
          );
          const grpRow = (await db.query('SELECT id FROM groups WHERE assignment_id = $1 AND name = $2', [newAssignment.id, grp.name.trim()])).rows[0];
          const grpId = grpRow ? grpRow.id : grpInsert.rows[0]?.id;

          // Always add leader as member
          await db.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [grpId, parseInt(grp.leader_id)]);

          // Add other members
          if (Array.isArray(grp.member_ids)) {
            for (const mId of grp.member_ids) {
              if (parseInt(mId) !== parseInt(grp.leader_id)) {
                await db.query(
                  `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`,
                  [grpId, parseInt(mId)]
                );
              }
            }
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully.',
      assignment: newAssignment
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/assignments/:id (Professor only)
async function updateAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id);
    const { title, description, deadline, submission_type, max_score } = req.body;
    const userId = req.user.id;

    // Check assignment ownership
    const assignRes = await db.query(
      `SELECT a.id, a.created_by, c.professor_id 
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

    if (assignRes.rows[0].created_by !== userId && assignRes.rows[0].professor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this assignment.'
      });
    }

    const updates = [];
    const params = [];

    if (title) {
      params.push(title.trim());
      updates.push(`title = $${params.length}`);
    }
    if (description) {
      params.push(description.trim());
      updates.push(`description = $${params.length}`);
    }
    if (deadline) {
      params.push(new Date(deadline).toISOString());
      updates.push(`deadline = $${params.length}`);
    }
    if (submission_type) {
      const normType = submission_type.toUpperCase();
      params.push(normType);
      updates.push(`submission_type = $${params.length}`);
    }
    if (max_score) {
      params.push(parseInt(max_score));
      updates.push(`max_score = $${params.length}`);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(assignmentId);

    await db.query(
      `UPDATE assignments SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    const updatedRes = await db.query('SELECT * FROM assignments WHERE id = $1', [assignmentId]);

    return res.status(200).json({
      success: true,
      message: 'Assignment updated successfully.',
      assignment: updatedRes.rows[0]
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/assignments/:id (Professor only)
async function deleteAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id);
    const userId = req.user.id;

    const assignRes = await db.query(
      `SELECT a.id, a.created_by, c.professor_id 
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

    if (assignRes.rows[0].created_by !== userId && assignRes.rows[0].professor_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this assignment.'
      });
    }

    await db.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);

    return res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment
};
