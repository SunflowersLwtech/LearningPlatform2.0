const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const connectDB = require('./config/database');
const rateLimiter = require('./src/middleware/rateLimiter');
const { handleUploadError } = require('./src/middleware/upload');
const { initializeSocket } = require('./src/utils/notifications');
const { sanitizeInput, securityHeaders } = require('./src/middleware/security');

dotenv.config();

// 验证必需的环境变量
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`错误: 缺少必需的环境变量 ${envVar}`);
        process.exit(1);
    }
}

const app = express();
const server = http.createServer(app);

connectDB();

// 配置CORS - 更安全的设置
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://learning-platform-lqy1.onrender.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 安全中间件
app.use(securityHeaders());
app.use(sanitizeInput);
// 配置静态文件服务
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // 缓存1天
  etag: true
}));

// 限制根目录静态文件访问 - 只允许特定文件类型
app.use('/views', express.static(path.join(__dirname, 'views'), {
  maxAge: '1h',
  etag: true
}));

// 配置uploads目录的静态服务，支持所有文件类型
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', // 上传文件缓存7天
  etag: true,
  setHeaders: (res, path) => {
    // 设置正确的MIME类型
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (path.endsWith('.doc') || path.endsWith('.docx')) {
      res.setHeader('Content-Type', 'application/msword');
    } else if (path.endsWith('.txt')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    }

    // CORS头已由中间件处理，无需重复设置
  }
}));
app.use(rateLimiter());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/permissions', require('./src/routes/permissions'));
app.use('/api/data-maintenance', require('./src/routes/dataMaintenance'));
app.use('/api/students', require('./src/routes/students'));
app.use('/api/staff', require('./src/routes/staff'));
app.use('/api/classes', require('./src/routes/classes'));
app.use('/api/courses', require('./src/routes/courses'));
app.use('/api/assignments', require('./src/routes/assignments'));
app.use('/api/learning', require('./src/routes/learning'));
app.use('/api/analytics', require('./src/routes/analytics'));

app.use(handleUploadError);

// 添加健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '学习平台管理系统 API',
    version: '1.0.0',
    modules: [
      '校务与学籍管理 (Administration & Student Information)',
      '教学过程管理 (Teaching & Instruction)',
      '学生学习与互动 (Learning & Interaction)',
      '评价与分析 (Assessment & Analytics)'
    ]
  });
});

// 404处理中间件（在所有路由之后）
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 添加全局错误处理（必须在最后）
const { globalErrorHandler } = require('./src/utils/errorHandler');
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

initializeSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`绑定地址: ${HOST}:${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log('实时通知系统已启动');
  
  // Get local IP for Windows access
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const localIPs = [];
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(networkInterface => {
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        localIPs.push(networkInterface.address);
      }
    });
  });
  
  console.log('\n🌐 访问地址:');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`   http://${ip}:${PORT}`);
    });
  }
  console.log('\n🔑 登录凭据:');
  console.log('   管理员: principal@school.edu / admin123');
  console.log('   教师: wang@school.edu / admin123');
  console.log('   学生: 20230001 / 20230001');
  console.log('\n💡 如果 Windows 浏览器无法连接，运行: ./fix-windows-access.sh\n');
});