const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// Acknowledge submission (student group leader or individual or professor)
router.post('/:id/acknowledge', submissionController.acknowledgeSubmission);

// Grade submission (professor only)
router.post('/:id/grade', requireRole('PROFESSOR'), submissionController.gradeSubmission);

module.exports = router;
