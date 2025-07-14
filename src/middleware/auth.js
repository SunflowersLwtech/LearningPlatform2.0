const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const { hasPermission, canAccessResource, canPerformAction, getPermissionError, PERMISSIONS } = require('../utils/permissions');
const { createError, sendErrorResponse } = require('../utils/errorHandler');

exports.authenticate = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，未提供认证令牌'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    if (decoded.userType === 'staff') {
      user = await Staff.findById(decoded.id).select('-password');
    } else if (decoded.userType === 'student') {
      user = await Student.findById(decoded.id);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '令牌无效，用户不存在'
      });
    }
    
    req.user = user;
    req.userType = decoded.userType;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '令牌无效',
      error: error.message
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (req.userType === 'student') {
      if (!roles.includes('student')) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
    } else if (req.userType === 'staff') {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `角色 ${req.user.role} 无权限访问此资源`
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: '未知用户类型'
      });
    }
    
    next();
  };
};

// 新的增强权限检查中间件
exports.checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // 检查是否为模型属性权限
      if (permission.startsWith('can') && req.userType === 'staff') {
        // 检查用户的模型属性权限
        if (!req.user.permissions || !req.user.permissions[permission]) {
          const errorMessage = `缺少权限: ${permission}`;
          return sendErrorResponse(res, createError.forbidden(errorMessage));
        }
      } else {
        // 检查常量定义的权限
        if (!hasPermission(req.user, req.userType, permission)) {
          const errorMessage = getPermissionError(permission, req.user?.role || req.userType);
          return sendErrorResponse(res, createError.forbidden(errorMessage));
        }
      }
      
      next();
    } catch (error) {
      return sendErrorResponse(res, createError.internal('权限检查失败'));
    }
  };
};

// 新的操作权限检查中间件
exports.checkActionPermission = (action, resourceType = null) => {
  return async (req, res, next) => {
    try {
      const context = {
        resourceType,
        resource: null
      };
      
      // 如果指定了资源类型，尝试获取资源
      if (resourceType && req.params.id) {
        const resourceId = req.params.id;
        
        // 根据资源类型获取资源
        switch (resourceType) {
          case 'student':
            context.resource = await Student.findById(resourceId).populate('class');
            break;
          case 'staff':
            context.resource = await Staff.findById(resourceId);
            break;
          case 'course':
            const Course = require('../models/Course');
            context.resource = await Course.findById(resourceId).populate('teacher');
            break;
          case 'assignment':
            const Assignment = require('../models/Assignment');
            context.resource = await Assignment.findById(resourceId).populate('teacher course');
            break;
          case 'grade':
            const Grade = require('../models/Grade');
            context.resource = await Grade.findById(resourceId).populate('student course');
            break;
        }
        
        if (!context.resource) {
          return sendErrorResponse(res, createError.notFound('资源不存在'));
        }
      }
      
      if (!canPerformAction(req.user, req.userType, action, context)) {
        const errorMessage = getPermissionError(action, req.user?.role || req.userType);
        return sendErrorResponse(res, createError.forbidden(errorMessage));
      }
      
      // 将资源附加到请求对象，供后续使用
      if (context.resource) {
        req.resource = context.resource;
      }
      
      next();
    } catch (error) {
      return sendErrorResponse(res, createError.internal('权限检查失败'));
    }
  };
};

// 增强的资源访问控制中间件
exports.requireOwnResource = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      let resource = null;
      
      // 获取资源对象
      switch (resourceType) {
        case 'student':
          resource = await Student.findById(resourceId).populate('class');
          break;
        case 'staff':
          resource = await Staff.findById(resourceId);
          break;
        case 'submission':
          const Submission = require('../models/Submission');
          resource = await Submission.findById(resourceId).populate('student assignment');
          break;
        case 'grade':
          const Grade = require('../models/Grade');
          resource = await Grade.findById(resourceId).populate('student course');
          break;
        case 'assignment':
          const Assignment = require('../models/Assignment');
          resource = await Assignment.findById(resourceId).populate('teacher course');
          break;
        case 'course':
          const Course = require('../models/Course');
          resource = await Course.findById(resourceId).populate('teacher enrolledClasses');
          break;
      }
      
      if (!resource) {
        return sendErrorResponse(res, createError.notFound('资源不存在'));
      }
      
      // 使用新的权限系统检查访问权限
      if (!canAccessResource(req.user, req.userType, resourceType, resource)) {
        return sendErrorResponse(res, createError.forbidden('无权访问此资源'));
      }
      
      // 将资源附加到请求对象
      req.resource = resource;
      next();
    } catch (error) {
      return sendErrorResponse(res, createError.internal('权限检查失败'));
    }
  };
};

// 批量资源访问控制中间件
exports.filterAccessibleResources = (resourceType) => {
  return async (req, res, next) => {
    try {
      // 为查询添加访问控制过滤器
      if (req.userType === 'student') {
        // 学生只能查看自己相关的资源
        switch (resourceType) {
          case 'assignments':
            req.query.studentId = req.user._id;
            break;
          case 'grades':
            req.query.student = req.user._id;
            break;
          case 'courses':
            req.query.enrolledStudents = req.user._id;
            break;
        }
      } else if (req.userType === 'staff') {
        const staff = req.user;
        
        // 根据角色限制查询范围
        if (['admin', 'principal', 'vice_principal'].includes(staff.role)) {
          // 高级角色可以查看所有资源，不添加过滤器
        } else if (staff.role === 'director') {
          // 主任可以查看部门相关资源
          switch (resourceType) {
            case 'students':
              req.query.department = staff.department;
              break;
            case 'courses':
              req.query.department = staff.department;
              break;
          }
        } else if (staff.role === 'head_teacher') {
          // 班主任只能查看自己班级的资源
          switch (resourceType) {
            case 'students':
              req.query.class = { $in: staff.classes };
              break;
            case 'assignments':
              req.query.assignedTo = { $elemMatch: { class: { $in: staff.classes } } };
              break;
          }
        } else if (staff.role === 'teacher') {
          // 普通教师只能查看自己教授的课程相关资源
          switch (resourceType) {
            case 'courses':
              req.query.teacher = staff._id;
              break;
            case 'assignments':
              req.query.teacher = staff._id;
              break;
            case 'grades':
              req.query.teacher = staff._id;
              break;
          }
        }
      }
      
      next();
    } catch (error) {
      return sendErrorResponse(res, createError.internal('权限过滤失败'));
    }
  };
};

// 动态权限检查中间件 - 支持多种权限组合
exports.requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    try {
      // 权限检查日志
      
      const hasAnyPermission = permissions.some(permission => 
        hasPermission(req.user, req.userType, permission)
      );
      
      // 权限检查结果
      
      if (!hasAnyPermission) {
        const errorMessage = `需要以下任一权限: ${permissions.join(', ')}`;
        // 拒绝访问
        return sendErrorResponse(res, createError.forbidden(errorMessage));
      }
      
      // 允许访问
      next();
    } catch (error) {
      // 权限检查错误
      return sendErrorResponse(res, createError.internal('权限检查失败'));
    }
  };
};

// 条件权限检查中间件
exports.requirePermissionIf = (condition, permission) => {
  return (req, res, next) => {
    try {
      if (condition(req)) {
        if (!hasPermission(req.user, req.userType, permission)) {
          const errorMessage = getPermissionError(permission, req.user?.role || req.userType);
          return sendErrorResponse(res, createError.forbidden(errorMessage));
        }
      }
      
      next();
    } catch (error) {
      return sendErrorResponse(res, createError.internal('权限检查失败'));
    }
  };
};