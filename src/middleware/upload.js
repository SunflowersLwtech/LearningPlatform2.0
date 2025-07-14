const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    let subDir = 'general';
    
    // 根据文件字段名或路径确定子目录
    if (file.fieldname === 'avatar') {
      subDir = 'avatars';
    } else if (req.route.path.includes('assignments')) {
      subDir = 'assignments';
    } else if (req.route.path.includes('resources')) {
      subDir = 'resources';
    } else if (req.route.path.includes('avatar')) {
      subDir = 'avatars';
    }
    
    const fullPath = path.join(uploadDir, subDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const sanitizedExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${file.fieldname}-${uniqueId}${sanitizedExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/mp3'],
    text: ['text/plain', 'text/csv']
  };
  
  const allAllowedTypes = Object.values(allowedTypes).flat();
  
  // 基础MIME类型检查
  if (!allAllowedTypes.includes(file.mimetype)) {
    return cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
  
  // 文件名安全检查
  const filename = file.originalname.toLowerCase();
  
  // 检查文件扩展名是否与MIME类型匹配
  const mimeToExtension = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'video/mp4': ['.mp4'],
    'audio/mpeg': ['.mp3'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv']
  };
  
  const expectedExtensions = mimeToExtension[file.mimetype];
  if (expectedExtensions) {
    const hasValidExtension = expectedExtensions.some(ext => filename.endsWith(ext));
    if (!hasValidExtension) {
      return cb(new Error(`文件扩展名与类型不匹配: ${file.originalname}`), false);
    }
  }
  
  // 检查危险文件名模式
  const dangerousPatterns = [
    /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.com$/i, /\.scr$/i,
    /\.vbs$/i, /\.js$/i, /\.jar$/i, /\.sh$/i, /\.php$/i,
    /\.asp$/i, /\.jsp$/i, /\.htm$/i, /\.html$/i
  ];
  
  const isDangerous = dangerousPatterns.some(pattern => pattern.test(filename));
  if (isDangerous) {
    return cb(new Error(`禁止上传的文件类型: ${file.originalname}`), false);
  }
  
  // 检查文件名中的特殊字符
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(file.originalname)) {
    return cb(new Error('文件名包含非法字符'), false);
  }
  
  // 检查文件名长度
  if (file.originalname.length > 255) {
    return cb(new Error('文件名过长'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
    files: 10
  }
});

// 专门的头像上传配置
const avatarUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // 头像只允许图片格式
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('头像只支持 JPG、PNG、GIF、WebP 格式'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB 限制
    files: 1
  }
});

const uploadMiddleware = {
  single: (fieldName) => upload.single(fieldName),
  multiple: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),
  fields: (fields) => upload.fields(fields),
  avatar: () => avatarUpload.single('avatar')
};

const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超出限制',
        maxSize: process.env.MAX_FILE_SIZE || '10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量超出限制'
      });
    }
  }
  
  if (error.message.includes('不支持的文件类型')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  uploadMiddleware,
  handleUploadError
};