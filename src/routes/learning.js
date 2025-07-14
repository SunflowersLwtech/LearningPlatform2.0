const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getStudentDashboard,
  getAssignments,
  submitAssignment,
  getResources,
  downloadResource,
  getDiscussions,
  getDiscussionById,
  participateInDiscussion,
  uploadResource,
  createDiscussion
} = require('../controllers/learningController');
const { uploadMiddleware } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/dashboard', authorize('student'), getStudentDashboard);

router.get('/assignments', authorize('student'), getAssignments);
router.post('/assignments/:assignmentId/submit', 
  authorize('student'), 
  uploadMiddleware.multiple('attachments', 5), 
  submitAssignment
);

router.get('/resources', getResources);
router.post('/resources', 
  authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), 
  uploadMiddleware.single('file'), 
  uploadResource
);
router.get('/resources/:id/download', downloadResource);

router.get('/discussions', getDiscussions);
router.get('/discussions/:id', getDiscussionById);
router.post('/discussions', createDiscussion);
router.post('/discussions/:discussionId/participate',
  uploadMiddleware.multiple('attachments', 3),
  participateInDiscussion
);

module.exports = router;