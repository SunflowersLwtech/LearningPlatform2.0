const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validateLogin, validateRegister, validateStaffCreate, handleValidationErrors } = require('../middleware/validation');
const { uploadMiddleware, handleUploadError } = require('../middleware/upload');
const {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getAvailableRoles,
  validateCredentials,
  uploadAvatar,
  deleteAvatar
} = require('../controllers/authController');

const router = express.Router();

// 角色和身份验证相关
router.get('/roles', getAvailableRoles);
router.post('/validate-credentials', validateCredentials);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/register', validateRegister, handleValidationErrors, register);

// 用户资料相关
router.get('/me', authenticate, getProfile); // 添加/me端点作为/profile的别名
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

// 头像管理
router.post('/avatar', authenticate, uploadMiddleware.avatar(), handleUploadError, uploadAvatar);
router.delete('/avatar', authenticate, deleteAvatar);

// 登出
router.post('/logout', authenticate, logout);

module.exports = router;