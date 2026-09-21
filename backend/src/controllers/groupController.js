const db = require('../db/dbClient');

// GET /api/groups
async function getGroups(req, res, next) {
  try {
    const { assignmentId } = req.query;

    let query = `
      SELECT g.id, g.assignment_id, g.name, g.leader_id, g.created_at,
             u.name as leader_name, u.email as leader_email, u.avatar_url as leader_avatar,
             a.title as assignment_title
      FROM groups g
      JOIN users u ON g.leader_id = u.id
      JOIN assignments a ON g.assignment_id = a.id
    `;
    const params = [];

    if (assignmentId) {
      params.push(parseInt(assignmentId));
      query += ` WHERE g.assignment_id = $1`;
    }

    query += ` ORDER BY g.name ASC`;

    const result = await db.query(query, params);

    const groupsWithMembers = await Promise.all(
      result.rows.map(async (grp) => {
        const membersRes = await db.query(
          `SELECT u.id, u.name, u.email, u.avatar_url, gm.joined_at
           FROM group_members gm
           JOIN users u ON gm.student_id = u.id
           WHERE gm.group_id = $1
           ORDER BY u.name ASC`,
          [grp.id]
        );
        return {
          ...grp,
          members: membersRes.rows
        };
      })
    );

    return res.status(200).json({
      success: true,
      groups: groupsWithMembers
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/groups/:id
async function getGroupById(req, res, next) {
  try {
    const groupId = parseInt(req.params.id);

    const groupRes = await db.query(
      `SELECT g.id, g.assignment_id, g.name, g.leader_id, g.created_at,
              u.name as leader_name, u.email as leader_email, u.avatar_url as leader_avatar,
              a.title as assignment_title, a.course_id
       FROM groups g
       JOIN users u ON g.leader_id = u.id
       JOIN assignments a ON g.assignment_id = a.id
       WHERE g.id = $1`,
      [groupId]
    );

    if (groupRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.'
      });
    }

    const group = groupRes.rows[0];

    const membersRes = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.student_id = u.id
       WHERE gm.group_id = $1
       ORDER BY u.name ASC`,
      [groupId]
    );

    const subRes = await db.query(
      `SELECT * FROM submissions WHERE assignment_id = $1 AND group_id = $2`,
      [group.assignment_id, groupId]
    );

    return res.status(200).json({
      success: true,
      group: {
        ...group,
        members: membersRes.rows,
        submission: subRes.rows[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/groups
async function createGroup(req, res, next) {
  try {
    const { assignment_id, name, member_ids } = req.body;
    const user = req.user;

    if (!assignment_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Assignment ID and group name are required.'
      });
    }

    // Check assignment
    const assignRes = await db.query(
      'SELECT id, course_id, submission_type FROM assignments WHERE id = $1',
      [parseInt(assignment_id)]
    );

    if (assignRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.'
      });
    }

    if (assignRes.rows[0].submission_type !== 'GROUP') {
      return res.status(400).json({
        success: false,
        message: 'Groups can only be formed for GROUP assignments.'
      });
    }

    // Determine leader: if professor creating, use provided leader or first member; if student creating, user is leader
    let leaderId = user.id;
    if (user.role === 'PROFESSOR' && req.body.leader_id) {
      leaderId = parseInt(req.body.leader_id);
    }

    // Check if leader is already in a group for this assignment
    const leaderGroupCheck = await db.query(
      `SELECT g.id, g.name 
       FROM group_members gm 
       JOIN groups g ON gm.group_id = g.id 
       WHERE g.assignment_id = $1 AND gm.student_id = $2`,
      [parseInt(assignment_id), leaderId]
    );

    if (leaderGroupCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Student is already in group '${leaderGroupCheck.rows[0].name}' for this assignment.`
      });
    }

    const insertRes = await db.query(
      `INSERT INTO groups (assignment_id, name, leader_id) VALUES ($1, $2, $3) RETURNING *`,
      [parseInt(assignment_id), name.trim(), leaderId]
    );

    let newGroup = insertRes.rows[0];
    if (!newGroup) {
      const fetch = await db.query(
        'SELECT * FROM groups WHERE assignment_id = $1 AND name = $2',
        [parseInt(assignment_id), name.trim()]
      );
      newGroup = fetch.rows[0];
    }

    // Insert leader as member
    await db.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [newGroup.id, leaderId]);

    // Insert additional members
    if (Array.isArray(member_ids)) {
      for (const mId of member_ids) {
        const idNum = parseInt(mId);
        if (idNum && idNum !== leaderId) {
          // Check if already in another group
          const memberCheck = await db.query(
            `SELECT g.name FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE g.assignment_id = $1 AND gm.student_id = $2`,
            [parseInt(assignment_id), idNum]
          );
          if (memberCheck.rows.length === 0) {
            await db.query(
              `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`,
              [newGroup.id, idNum]
            );
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Group created successfully.',
      group: newGroup
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/groups/:id/members
async function addMember(req, res, next) {
  try {
    const groupId = parseInt(req.params.id);
    const { student_id } = req.body;
    const user = req.user;

    const groupRes = await db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
    if (groupRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.'
      });
    }

    const group = groupRes.rows[0];

    // Only leader or professor can add members
    if (user.role !== 'PROFESSOR' && group.leader_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the group leader or course professor can add members.'
      });
    }

    const targetStudentId = parseInt(student_id);

    // Check if already in this group
    const existing = await db.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND student_id = $2',
      [groupId, targetStudentId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Student is already a member of this group.'
      });
    }

    await db.query(
      'INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)',
      [groupId, targetStudentId]
    );

    return res.status(200).json({
      success: true,
      message: 'Member added to group successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/groups/:id/members/:studentId
async function removeMember(req, res, next) {
  try {
    const groupId = parseInt(req.params.id);
    const targetStudentId = parseInt(req.params.studentId);
    const user = req.user;

    const groupRes = await db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
    if (groupRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found.'
      });
    }

    const group = groupRes.rows[0];

    // Cannot remove leader
    if (group.leader_id === targetStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the group leader.'
      });
    }

    // Only leader, professor, or student leaving self
    if (user.role !== 'PROFESSOR' && group.leader_id !== user.id && user.id !== targetStudentId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to remove member.'
      });
    }

    await db.query(
      'DELETE FROM group_members WHERE group_id = $1 AND student_id = $2',
      [groupId, targetStudentId]
    );

    return res.status(200).json({
      success: true,
      message: 'Member removed from group.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  addMember,
  removeMember
};
