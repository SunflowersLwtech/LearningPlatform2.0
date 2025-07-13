const express = require('express');
const { authenticate, authorize, checkPermission } = require('../middleware/auth');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  updateEnrollmentStatus,
  deleteStudent,
  getCurrentStudent
} = require('../controllers/studentController');

const router = express.Router();

router.use(authenticate);

// 学生获取自己的信息
router.get('/me', authorize('student'), getCurrentStudent);

router.route('/')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getAllStudents)
  .post(authorize('admin', 'principal', 'director'), checkPermission('canManageStudents'), createStudent);

router.route('/:id')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getStudentById)
  .put(authorize('admin', 'principal', 'director'), checkPermission('canManageStudents'), updateStudent)
  .delete(authorize('admin', 'principal'), checkPermission('canManageStudents'), deleteStudent);

router.put('/:id/status', 
  authorize('admin', 'principal', 'director'), 
  checkPermission('canManageStudents'), 
  updateEnrollmentStatus
);

module.exports = router;