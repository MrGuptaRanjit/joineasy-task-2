const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', assignmentController.getAssignments);
router.get('/:id', assignmentController.getAssignmentById);
router.post('/', requireRole('PROFESSOR'), assignmentController.createAssignment);
router.put('/:id', requireRole('PROFESSOR'), assignmentController.updateAssignment);
router.delete('/:id', requireRole('PROFESSOR'), assignmentController.deleteAssignment);

// Submissions nested under assignments
router.post('/:id/submit', requireRole('STUDENT'), submissionController.submitAssignment);
router.get('/:id/submissions', requireRole('PROFESSOR'), submissionController.getAssignmentSubmissions);

module.exports = router;
