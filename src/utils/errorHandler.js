// 统一错误响应格式

class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const sendErrorResponse = (res, error, customMessage = null) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 默认错误格式
  const errorResponse = {
    success: false,
    message: customMessage || error.message || '服务器内部错误',
    timestamp: new Date().toISOString()
  };
  
  // 添加错误代码（如果有）
  if (error.errorCode) {
    errorResponse.errorCode = error.errorCode;
  }
  
  // 开发环境下添加详细错误信息
  if (!isProduction) {
    errorResponse.stack = error.stack;
    
    if (error.errors) {
      // Mongoose验证错误
      errorResponse.validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }));
    }
  }
  
  // 确定HTTP状态码
  const statusCode = error.statusCode || error.status || 500;
  
  res.status(statusCode).json(errorResponse);
};

const sendSuccessResponse = (res, data = null, message = '操作成功', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  res.status(statusCode).json(response);
};

// 常见错误类型
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// 预定义错误消息
const ErrorMessages = {
  // 通用错误
  INTERNAL_ERROR: '服务器内部错误',
  INVALID_REQUEST: '请求参数无效',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '权限不足',
  NOT_FOUND: '资源不存在',
  
  // 认证相关
  LOGIN_FAILED: '用户名或密码错误',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  TOKEN_INVALID: '无效的访问令牌',
  
  // 用户相关
  USER_NOT_FOUND: '用户不存在',
  USER_ALREADY_EXISTS: '用户已存在',
  INSUFFICIENT_PERMISSIONS: '权限不足',
  
  // 数据相关
  DATA_NOT_FOUND: '数据不存在',
  DATA_CONFLICT: '数据冲突',
  INVALID_DATA: '数据格式无效',
  
  // 业务相关
  COURSE_FULL: '课程已满员',
  ASSIGNMENT_SUBMITTED: '作业已提交',
  GRADE_CALCULATED: '成绩已计算'
};

// 创建标准化错误
const createError = {
  badRequest: (message = ErrorMessages.INVALID_REQUEST, errorCode = ErrorTypes.BAD_REQUEST) => 
    new AppError(message, 400, errorCode),
    
  unauthorized: (message = ErrorMessages.UNAUTHORIZED, errorCode = ErrorTypes.UNAUTHORIZED) => 
    new AppError(message, 401, errorCode),
    
  forbidden: (message = ErrorMessages.FORBIDDEN, errorCode = ErrorTypes.FORBIDDEN) => 
    new AppError(message, 403, errorCode),
    
  notFound: (message = ErrorMessages.NOT_FOUND, errorCode = ErrorTypes.NOT_FOUND) => 
    new AppError(message, 404, errorCode),
    
  conflict: (message = ErrorMessages.DATA_CONFLICT, errorCode = ErrorTypes.CONFLICT) => 
    new AppError(message, 409, errorCode),
    
  internal: (message = ErrorMessages.INTERNAL_ERROR, errorCode = ErrorTypes.INTERNAL_ERROR) => 
    new AppError(message, 500, errorCode),
    
  validation: (message = ErrorMessages.INVALID_DATA, errorCode = ErrorTypes.VALIDATION_ERROR) => 
    new AppError(message, 400, errorCode)
};

// 全局错误处理中间件
const globalErrorHandler = (err, req, res, next) => {
  // 处理Mongoose错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    return sendErrorResponse(res, createError.validation(message));
  }
  
  if (err.name === 'CastError') {
    return sendErrorResponse(res, createError.badRequest('无效的ID格式'));
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendErrorResponse(res, createError.conflict(`${field} 已存在`));
  }
  
  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return sendErrorResponse(res, createError.unauthorized(ErrorMessages.TOKEN_INVALID));
  }
  
  if (err.name === 'TokenExpiredError') {
    return sendErrorResponse(res, createError.unauthorized(ErrorMessages.TOKEN_EXPIRED));
  }
  
  // 自定义错误
  if (err.isOperational) {
    return sendErrorResponse(res, err);
  }
  
  // 未知错误
  console.error('Unexpected Error:', err);
  sendErrorResponse(res, createError.internal());
};

module.exports = {
  AppError,
  sendErrorResponse,
  sendSuccessResponse,
  createError,
  ErrorTypes,
  ErrorMessages,
  globalErrorHandler
};