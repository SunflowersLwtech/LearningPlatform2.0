const express = require('express');
const { authenticate, authorize, checkPermission } = require('../middleware/auth');
const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getCurrentStaff,
  updateStaffRole,
  getStaffByDepartment
} = require('../controllers/staffController');

const router = express.Router();

router.use(authenticate);

// 员工获取自己的信息
router.get('/me', authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getCurrentStaff);

// 按部门获取员工
router.get('/department/:department', 
  authorize('admin', 'principal', 'director'), 
  getStaffByDepartment
);

router.route('/')
  .get(authorize('admin', 'principal', 'director'), getAllStaff)
  .post(authorize('admin', 'principal'), checkPermission('canManageStaff'), createStaff);

router.route('/:id')
  .get(authorize('admin', 'principal', 'director', 'head_teacher', 'teacher'), getStaffById)
  .put(authorize('admin', 'principal'), checkPermission('canManageStaff'), updateStaff)
  .delete(authorize('admin', 'principal'), checkPermission('canManageStaff'), deleteStaff);

// 更新员工角色
router.put('/:id/role', 
  authorize('admin', 'principal'), 
  checkPermission('canManageStaff'), 
  updateStaffRole
);

module.exports = router;
