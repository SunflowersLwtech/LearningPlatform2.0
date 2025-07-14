const { createError, sendErrorResponse } = require('../utils/errorHandler');

// 防止NoSQL注入的中间件
exports.sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // 移除MongoDB操作符
          if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
          } else {
            sanitize(obj[key]);
          }
        } else if (typeof obj[key] === 'string') {
          // 清理字符串中的特殊字符
          obj[key] = obj[key].replace(/[<>]/g, '');
        }
      }
    }
    return obj;
  };

  // 清理请求参数
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// 安全头部中间件
exports.securityHeaders = () => {
  return (req, res, next) => {
    // XSS保护
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // 防止内容类型嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // 防止点击劫持
    res.setHeader('X-Frame-Options', 'DENY');
    // HSTS (仅在HTTPS环境下)
    if (req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
};

// 输入长度限制中间件
exports.limitInputSize = (maxSize = 1000) => {
  return (req, res, next) => {
    const checkSize = (obj, path = '') => {
      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === 'string') {
          if (obj[key].length > maxSize) {
            return sendErrorResponse(res, createError.badRequest(`输入内容过长: ${currentPath}`));
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          const result = checkSize(obj[key], currentPath);
          if (result) return result;
        }
      }
    };

    if (req.body) {
      const result = checkSize(req.body);
      if (result) return result;
    }

    next();
  };
};