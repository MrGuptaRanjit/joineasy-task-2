const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourseById);
router.post('/', requireRole('PROFESSOR'), courseController.createCourse);
router.post('/:id/enroll', requireRole('STUDENT'), courseController.enrollCourse);

module.exports = router;
