const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const { createError, sendSuccessResponse, sendErrorResponse } = require('../utils/errorHandler');

const generateToken = (id, userType, isRefresh = false) => {
  const expiresIn = isRefresh 
    ? process.env.JWT_REFRESH_EXPIRE || '7d'
    : process.env.JWT_EXPIRE || '2h';
    
  return jwt.sign({ id, userType, isRefresh }, process.env.JWT_SECRET, {
    expiresIn
  });
};

const generateTokenPair = (id, userType) => {
  const accessToken = generateToken(id, userType, false);
  const refreshToken = generateToken(id, userType, true);
  return { accessToken, refreshToken };
};

// 获取可用角色列表
exports.getAvailableRoles = async (req, res) => {
  try {
    const roles = {
      staff: [
        { value: 'admin', label: '系统管理员', description: '拥有系统最高权限' },
        { value: 'principal', label: '校长', description: '学校最高管理者' },
        { value: 'vice_principal', label: '副校长', description: '协助校长管理学校' },
        { value: 'director', label: '主任', description: '部门负责人' },
        { value: 'head_teacher', label: '班主任', description: '负责班级管理' },
        { value: 'teacher', label: '教师', description: '负责教学工作' }
      ],
      student: [
        { value: 'student', label: '学生', description: '在校学习的学生' }
      ]
    };
    
    sendSuccessResponse(res, roles, '获取角色列表成功');
  } catch (error) {
    sendErrorResponse(res, createError.internal('获取角色列表失败'));
  }
};

// 验证登录凭据（第一步：验证身份）
exports.validateCredentials = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return sendErrorResponse(res, createError.badRequest('用户名和密码不能为空'));
    }
    
    // 检查是否为教职工
    const staff = await Staff.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { staffId: identifier }
      ]
    }).select('+password');
    
    if (staff && await bcrypt.compare(password, staff.password)) {
      if (!staff.isActive) {
        return sendErrorResponse(res, createError.forbidden('账号已被停用'));
      }
      
      return sendSuccessResponse(res, {
        userType: 'staff',
        user: {
          id: staff._id,
          name: staff.name,
          identifier: staff.staffId,
          email: staff.email,
          role: staff.role,
          avatar: staff.avatar
        },
        availableRoles: [staff.role]
      }, '身份验证成功');
    }
    
    // 检查是否为学生
    const isEmail = identifier.includes('@');
    const studentQuery = isEmail ? { 'contactInfo.email': identifier } : { studentId: identifier };
    const student = await Student.findOne(studentQuery).select('+password');
    
    if (student && await bcrypt.compare(password, student.password)) {
      if (student.enrollmentStatus !== 'enrolled') {
        return sendErrorResponse(res, createError.forbidden('学生账号状态异常'));
      }
      
      return sendSuccessResponse(res, {
        userType: 'student',
        user: {
          id: student._id,
          name: student.name,
          identifier: student.studentId,
          grade: student.grade,
          avatar: student.avatar
        },
        availableRoles: ['student']
      }, '身份验证成功');
    }
    
    sendErrorResponse(res, createError.unauthorized('用户名或密码错误'));
  } catch (error) {
    sendErrorResponse(res, createError.internal('身份验证失败'));
  }
};

// 上传头像
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendErrorResponse(res, createError.badRequest('请选择头像文件'));
    }
    
    const userId = req.user.id;
    const userType = req.userType;
    
    // 构建头像URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // 更新用户头像
    let user;
    if (userType === 'staff') {
      user = await Staff.findByIdAndUpdate(
        userId,
        { avatar: avatarUrl },
        { new: true }
      ).select('-password');
    } else {
      user = await Student.findByIdAndUpdate(
        userId,
        { avatar: avatarUrl },
        { new: true }
      );
    }
    
    if (!user) {
      return sendErrorResponse(res, createError.notFound('用户不存在'));
    }
    
    sendSuccessResponse(res, {
      avatar: avatarUrl,
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar
      }
    }, '头像上传成功');
  } catch (error) {
    sendErrorResponse(res, createError.internal('头像上传失败'));
  }
};

// 删除头像
exports.deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType;
    
    // 获取当前用户信息
    let user;
    if (userType === 'staff') {
      user = await Staff.findById(userId);
    } else {
      user = await Student.findById(userId);
    }
    
    if (!user) {
      return sendErrorResponse(res, createError.notFound('用户不存在'));
    }
    
    // 删除服务器上的头像文件
    if (user.avatar) {
      const fs = require('fs');
      const path = require('path');
      const avatarPath = path.join(process.cwd(), user.avatar);
      
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }
    
    // 更新数据库
    if (userType === 'staff') {
      user = await Staff.findByIdAndUpdate(
        userId,
        { avatar: null },
        { new: true }
      ).select('-password');
    } else {
      user = await Student.findByIdAndUpdate(
        userId,
        { avatar: null },
        { new: true }
      );
    }
    
    sendSuccessResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar
      }
    }, '头像删除成功');
  } catch (error) {
    sendErrorResponse(res, createError.internal('头像删除失败'));
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password, userType, selectedRole } = req.body;
    
    if (!identifier || !password || !userType) {
      return sendErrorResponse(res, createError.badRequest('请提供用户名/学号、密码和用户类型'));
    }
    
    let user;
    let identifierField;
    
    if (userType === 'staff') {
      identifierField = identifier.includes('@') ? 'email' : 'staffId';
      user = await Staff.findOne({ [identifierField]: identifier }).select('+password');
    } else if (userType === 'student') {
      // 支持学号或邮箱登录
      const isEmail = identifier.includes('@');
      const query = isEmail ? { 'contactInfo.email': identifier } : { studentId: identifier };
      user = await Student.findOne(query).select('+password');
      if (!user) {
        return sendErrorResponse(res, createError.unauthorized('学生账号不存在或密码错误'));
      }
    } else {
      return sendErrorResponse(res, createError.badRequest('无效的用户类型'));
    }
    
    if (!user) {
      return sendErrorResponse(res, createError.unauthorized('账号不存在或密码错误'));
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return sendErrorResponse(res, createError.unauthorized('账号不存在或密码错误'));
    }
    
    if (userType === 'staff' && !user.isActive) {
      return sendErrorResponse(res, createError.forbidden('账号已被停用'));
    }
    
    if (userType === 'student' && user.enrollmentStatus !== 'enrolled') {
      return sendErrorResponse(res, createError.forbidden('学生账号状态异常'));
    }
    
    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();
    
    const { accessToken, refreshToken } = generateTokenPair(user._id, userType);
    
    user.password = undefined;
    
    const responseData = {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        userType,
        role: userType === 'staff' ? user.role : 'student',
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        preferredLanguage: user.preferredLanguage,
        ...(userType === 'staff' ? {
          staffId: user.staffId,
          email: user.email,
          department: user.department,
          permissions: user.permissions
        } : {
          studentId: user.studentId,
          grade: user.grade,
          class: user.class,
          enrollmentStatus: user.enrollmentStatus
        })
      }
    };
    
    sendSuccessResponse(res, responseData, '登录成功');
  } catch (error) {
    console.error('登录错误详情:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { userType } = req.body;

    if (userType === 'staff') {
      const { name, email, password, staffId, role, department, phone } = req.body;

      // 验证必填字段
      if (!name || !email || !password || !staffId || !role) {
        return res.status(400).json({
          success: false,
          message: '请填写所有必填字段：姓名、邮箱、密码、工号、角色'
        });
      }

      const existingStaff = await Staff.findOne({
        $or: [{ email }, { staffId }]
      });

      if (existingStaff) {
        return res.status(400).json({
          success: false,
          message: '邮箱或工号已存在'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const staff = new Staff({
        name,
        email,
        password: hashedPassword,
        staffId,
        role,
        department: department || '未分配',
        phone: phone || ''
      });

      await staff.save();

      const { accessToken, refreshToken } = generateTokenPair(staff._id, 'staff');

      res.status(201).json({
        success: true,
        message: '教职工注册成功',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: staff._id,
            name: staff.name,
            staffId: staff.staffId,
            email: staff.email,
            userType: 'staff',
            role: staff.role,
            department: staff.department
          }
        }
      });
    } else if (userType === 'student') {
      const { name, email, password, studentId, grade, gender, phone, dateOfBirth } = req.body;

      // 验证必填字段
      if (!name || !email || !password || !studentId || !grade || !gender) {
        return res.status(400).json({
          success: false,
          message: '请填写所有必填字段：姓名、邮箱、密码、学号、年级、性别'
        });
      }

      const existingStudent = await Student.findOne({
        $or: [{ 'contactInfo.email': email }, { studentId }]
      });

      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: '邮箱或学号已存在'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const student = new Student({
        name,
        password: hashedPassword,
        studentId,
        grade,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('2000-01-01'),
        contactInfo: {
          email: email,
          phone: phone || ''
        },
        enrollmentStatus: 'enrolled'
      });

      await student.save();

      const { accessToken, refreshToken } = generateTokenPair(student._id, 'student');

      res.status(201).json({
        success: true,
        message: '学生注册成功',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: student._id,
            name: student.name,
            studentId: student.studentId,
            email: student.contactInfo?.email,
            userType: 'student',
            role: 'student',
            grade: student.grade,
            gender: student.gender
          }
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的用户类型'
      });
    }
  } catch (error) {
    console.error('注册错误详情:', error);
    res.status(400).json({
      success: false,
      message: '注册失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    let user;
    if (req.userType === 'staff') {
      user = await Staff.findById(req.user.id)
        .populate('classes', 'name grade')
        .select('-password');
    } else {
      user = await Student.findById(req.user.id)
        .populate('class', 'name grade headTeacher');
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // 定义允许更新的字段
    const allowedUpdates = req.userType === 'staff' 
      ? ['name', 'email', 'contactInfo', 'qualifications']
      : ['contactInfo'];
    
    // 过滤并验证更新字段
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: '包含不允许更新的字段'
      });
    }

    // 创建安全的更新对象，只包含允许的字段
    const safeUpdates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        safeUpdates[field] = req.body[field];
      }
    });
    
    let user;
    if (req.userType === 'staff') {
      user = await Staff.findByIdAndUpdate(
        req.user.id,
        safeUpdates,
        { new: true, runValidators: true }
      ).select('-password');
    } else {
      user = await Student.findByIdAndUpdate(
        req.user.id,
        safeUpdates,
        { new: true, runValidators: true }
      );
    }
    
    res.json({
      success: true,
      message: '个人信息更新成功',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新个人信息失败',
      error: error.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供当前密码和新密码'
      });
    }
    
    let user;
    if (req.userType === 'staff') {
      user = await Staff.findById(req.user.id).select('+password');
    } else {
      user = await Student.findById(req.user.id).select('+password');
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedNewPassword;
    await user.save();
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '修改密码失败',
      error: error.message
    });
  }
};

exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: '退出登录成功'
  });
};