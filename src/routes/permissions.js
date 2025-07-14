const express = require('express');
const { authenticate, checkPermission, requireAnyPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');
const {
  getAllPermissions,
  getRolePermissions,
  getUserPermissions,
  updateUserRole,
  checkPermissions,
  getRoleHistory
} = require('../controllers/permissionController');

const router = express.Router();

// 获取所有可用权限列表 (仅限管理员)
router.get('/permissions', 
  authenticate, 
  (req, res, next) => {
    console.log(`[路由调试] 用户类型: ${req.userType}, 用户ID: ${req.user?._id}`);
    // 立即拒绝学生访问
    if (req.userType === 'student') {
      return res.status(403).json({
        success: false,
        message: '学生无权访问权限管理功能'
      });
    }
    next();
  },
  requireAnyPermission(PERMISSIONS.SYSTEM_ADMIN, PERMISSIONS.USER_MANAGE_ROLES),
  getAllPermissions
);

// 获取所有角色及其权限配置 (仅限有权限管理权限的用户)
router.get('/roles', 
  authenticate,
  (req, res, next) => {
    // 立即拒绝学生访问
    if (req.userType === 'student') {
      return res.status(403).json({
        success: false,
        message: '学生无权访问角色权限配置'
      });
    }
    next();
  },
  requireAnyPermission(PERMISSIONS.USER_MANAGE_ROLES, PERMISSIONS.SYSTEM_ADMIN, PERMISSIONS.USER_READ),
  getRolePermissions
);

// 获取用户权限信息
router.get('/user/:userId?', 
  authenticate, 
  getUserPermissions
);

// 检查权限（用于前端权限控制）
router.post('/check', 
  authenticate, 
  checkPermissions
);

// 获取角色变更历史
router.get('/role-history/:userId', 
  authenticate,
  requireAnyPermission(PERMISSIONS.USER_MANAGE_ROLES, PERMISSIONS.SYSTEM_ADMIN),
  getRoleHistory
);

// 更新用户角色（仅限高级管理员）
router.put('/user/:userId/role', 
  authenticate,
  checkPermission(PERMISSIONS.USER_MANAGE_ROLES),
  updateUserRole
);

module.exports = router;