const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validateAssignmentCreate, handleValidationErrors } = require('../middleware/validation');
const {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  gradeSubmission,
  getSubmissions,
  publishAssignment
} = require('../controllers/assignmentController');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getAllAssignments)
  .post(
    authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'),
    validateAssignmentCreate,
    handleValidationErrors,
    createAssignment
  );

router.route('/:id')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getAssignmentById)
  .put(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), updateAssignment)
  .delete(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), deleteAssignment);

router.put('/:id/publish',
  authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'),
  publishAssignment
);

router.get('/:id/submissions',
  authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'),
  getSubmissions
);

router.put('/submissions/:submissionId/grade',
  authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'),
  gradeSubmission
);

// 学生专用路由 - 只能访问自己的作业
router.get('/student/my-assignments',
  authorize('student'),
  getAllAssignments
);

router.get('/student/:id',
  authorize('student'),
  getAssignmentById
);

module.exports = router;