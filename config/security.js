// 安全配置文件
const createError = require('http-errors');

// 生产环境安全配置
const SECURITY_CONFIG = {
  // 环境检查
  isProduction: process.env.NODE_ENV === 'production',
  
  // 输入验证规则
  validation: {
    // 字符串长度限制
    maxStringLength: 1000,
    maxTextLength: 10000,
    
    // 允许的文件类型
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    
    // 文件大小限制 (字节)
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxDocumentSize: 10 * 1024 * 1024, // 10MB
    
    // 用户输入模式
    patterns: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^1[3-9]\d{9}$/,
      studentId: /^[0-9]{8}$/,
      staffId: /^[A-Z0-9]{6,10}$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    }
  },
  
  // 错误处理配置
  errorHandling: {
    // 生产环境下隐藏详细错误信息
    hideStackTrace: true,
    
    // 通用错误消息
    genericErrorMessage: '服务器内部错误，请稍后重试',
    
    // 允许显示的错误类型
    allowedErrorTypes: ['ValidationError', 'CastError', 'AuthenticationError']
  }
};

// 输入验证函数
function validateInput(data, rules) {
  const errors = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    
    // 检查必填字段
    if (rule.required && (!value || value.trim() === '')) {
      errors.push(`${field} 是必填字段`);
      continue;
    }
    
    // 如果字段不是必填且为空，跳过其他验证
    if (!value && !rule.required) continue;
    
    // 类型检查
    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(`${field} 必须是字符串类型`);
      continue;
    }
    
    if (rule.type === 'number' && typeof value !== 'number') {
      errors.push(`${field} 必须是数字类型`);
      continue;
    }
    
    if (rule.type === 'email' && !SECURITY_CONFIG.validation.patterns.email.test(value)) {
      errors.push(`${field} 格式不正确`);
      continue;
    }
    
    // 长度检查
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${field} 长度不能超过 ${rule.maxLength} 个字符`);
    }
    
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${field} 长度不能少于 ${rule.minLength} 个字符`);
    }
    
    // 模式匹配
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${field} 格式不正确`);
    }
  }
  
  return errors;
}

// 安全的错误响应函数
function sendSecureErrorResponse(res, error, statusCode = 500) {
  let message = SECURITY_CONFIG.errorHandling.genericErrorMessage;
  let details = null;
  
  // 在开发环境下提供详细错误信息
  if (!SECURITY_CONFIG.isProduction) {
    message = error.message || message;
    details = error.stack;
  } else {
    // 生产环境下只显示特定类型的错误
    if (SECURITY_CONFIG.errorHandling.allowedErrorTypes.includes(error.name)) {
      message = error.message;
    }
  }
  
  const response = {
    success: false,
    message: message
  };
  
  // 只在开发环境下添加详细信息
  if (!SECURITY_CONFIG.isProduction && details) {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
}

// HTML内容清理函数
function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  
  // 移除所有HTML标签和脚本
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// 参数清理函数 - 防止NoSQL注入
function sanitizeParams(params) {
  if (!params || typeof params !== 'object') return params;
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(params)) {
    // 移除包含 $ 或 . 的键（MongoDB操作符）
    if (typeof key === 'string' && (key.includes('$') || key.includes('.'))) {
      continue;
    }
    
    // 递归清理对象
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeParams(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeParams(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// 文件类型验证
function validateFileType(mimetype, allowedTypes) {
  return allowedTypes.includes(mimetype);
}

// 文件大小验证
function validateFileSize(size, maxSize) {
  return size <= maxSize;
}

module.exports = {
  SECURITY_CONFIG,
  validateInput,
  sendSecureErrorResponse,
  sanitizeHtml,
  sanitizeParams,
  validateFileType,
  validateFileSize
};