const express = require('express');
const { authenticate, authorize, checkPermission } = require('../middleware/auth');
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollClass,
  getCourseStudents
} = require('../controllers/courseController');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getAllCourses)
  .post(authorize('admin', 'principal', 'director', 'teacher'), createCourse);

router.route('/:id')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getCourseById)
  .put(authorize('admin', 'principal', 'director', 'teacher'), updateCourse)
  .delete(authorize('admin', 'principal', 'director'), deleteCourse);

router.put('/:id/enroll',
  authorize('admin', 'principal', 'director', 'teacher'),
  enrollClass
);

router.get('/:id/students',
  authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'),
  getCourseStudents
);

// 学生专用路由 - 只能访问自己选修的课程
router.get('/student/my-courses',
  authorize('student'),
  getAllCourses
);

router.get('/student/:id',
  authorize('student'),
  getCourseById
);

module.exports = router;