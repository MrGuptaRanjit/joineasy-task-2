const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', groupController.getGroups);
router.get('/:id', groupController.getGroupById);
router.post('/', groupController.createGroup);
router.post('/:id/members', groupController.addMember);
router.delete('/:id/members/:studentId', groupController.removeMember);

module.exports = router;
