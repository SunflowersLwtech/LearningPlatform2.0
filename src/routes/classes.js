const express = require('express');
const { authenticate, authorize, checkPermission } = require('../middleware/auth');
const {
  createClass,
  getAllClasses,
  getClassById,
  getClassStudents,
  updateClass,
  updateSchedule,
  assignTeacher,
  getClassSchedule
} = require('../controllers/classController');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getAllClasses)
  .post(authorize('admin', 'principal', 'director'), checkPermission('canManageSchedule'), createClass);

router.route('/:id')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getClassById)
  .put(authorize('admin', 'principal', 'director'), checkPermission('canManageSchedule'), updateClass);

router.put('/:id/schedule',
  authorize('admin', 'principal', 'director'),
  checkPermission('canManageSchedule'),
  updateSchedule
);

router.put('/:id/assign-teacher',
  authorize('admin', 'principal', 'director'),
  checkPermission('canManageSchedule'),
  assignTeacher
);

router.get('/:id/schedule',
  authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'),
  getClassSchedule
);

router.get('/:id/students',
  authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'),
  getClassStudents
);

// 学生专用路由 - 只能访问自己的班级信息
router.get('/student/my-class',
  authorize('student'),
  getClassById
);

router.get('/student/my-class/schedule',
  authorize('student'),
  getClassSchedule
);

module.exports = router;