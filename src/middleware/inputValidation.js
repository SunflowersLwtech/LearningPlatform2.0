const { validateInput, sendSecureErrorResponse } = require('../../config/security');

// 用户注册验证
const validateUserRegistration = (req, res, next) => {
  const { userType } = req.body;
  
  if (userType === 'staff') {
    const rules = {
      name: { required: true, type: 'string', maxLength: 50 },
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string', minLength: 8, maxLength: 128 },
      staffId: { required: true, type: 'string', maxLength: 20 },
      role: { required: true, type: 'string' },
      department: { required: true, type: 'string', maxLength: 100 },
      phone: { required: false, type: 'string', maxLength: 20 }
    };
    
    const errors = validateInput(req.body, rules);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors
      });
    }
  } else if (userType === 'student') {
    const rules = {
      name: { required: true, type: 'string', maxLength: 50 },
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string', minLength: 8, maxLength: 128 },
      studentId: { required: true, type: 'string', maxLength: 20 },
      grade: { required: true, type: 'string' },
      gender: { required: true, type: 'string' }
    };
    
    const errors = validateInput(req.body, rules);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors
      });
    }
  }
  
  next();
};

// 登录验证
const validateLogin = (req, res, next) => {
  const rules = {
    identifier: { required: true, type: 'string', maxLength: 100 },
    password: { required: true, type: 'string', maxLength: 128 },
    userType: { required: true, type: 'string' }
  };
  
  const errors = validateInput(req.body, rules);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors
    });
  }
  
  next();
};

// 课程创建/更新验证
const validateCourse = (req, res, next) => {
  const rules = {
    name: { required: true, type: 'string', maxLength: 100 },
    subject: { required: true, type: 'string', maxLength: 50 },
    description: { required: false, type: 'string', maxLength: 1000 },
    grade: { required: true, type: 'string' },
    semester: { required: true, type: 'string' },
    academicYear: { required: true, type: 'string' },
    credits: { required: false, type: 'number' }
  };
  
  const errors = validateInput(req.body, rules);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors
    });
  }
  
  next();
};

// 作业创建/更新验证
const validateAssignment = (req, res, next) => {
  const rules = {
    title: { required: true, type: 'string', maxLength: 200 },
    description: { required: true, type: 'string', maxLength: 5000 },
    type: { required: true, type: 'string' },
    totalPoints: { required: true, type: 'number' },
    dueDate: { required: true, type: 'string' }
  };
  
  const errors = validateInput(req.body, rules);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors
    });
  }
  
  next();
};

// 讨论创建验证
const validateDiscussion = (req, res, next) => {
  const rules = {
    title: { required: true, type: 'string', maxLength: 200 },
    content: { required: true, type: 'string', maxLength: 10000 },
    type: { required: true, type: 'string' }
  };
  
  const errors = validateInput(req.body, rules);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors
    });
  }
  
  next();
};

// 密码修改验证
const validatePasswordChange = (req, res, next) => {
  const rules = {
    currentPassword: { required: true, type: 'string', maxLength: 128 },
    newPassword: { required: true, type: 'string', minLength: 8, maxLength: 128 }
  };
  
  const errors = validateInput(req.body, rules);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors
    });
  }
  
  // 检查新密码强度
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  if (!passwordPattern.test(req.body.newPassword)) {
    return res.status(400).json({
      success: false,
      message: '新密码必须包含至少8个字符，包括大小写字母和数字'
    });
  }
  
  next();
};

// MongoDB ObjectId 验证
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID格式'
      });
    }
    next();
  };
};

// 分页参数验证
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: '页码必须是大于0的数字'
    });
  }
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: '每页数量必须是1-100之间的数字'
    });
  }
  
  next();
};

module.exports = {
  validateUserRegistration,
  validateLogin,
  validateCourse,
  validateAssignment,
  validateDiscussion,
  validatePasswordChange,
  validateObjectId,
  validatePagination
};