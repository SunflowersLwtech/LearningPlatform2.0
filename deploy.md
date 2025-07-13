# 🚀 学习平台部署指南

## 本地vs生产环境差异排查

### 1. 环境变量配置

**本地开发环境使用：**
```bash
cp .env.production .env
```

**生产环境需要设置的环境变量：**
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=你的MongoDB连接字符串
JWT_SECRET=你的JWT密钥
ALLOWED_ORIGINS=你的域名
```

### 2. 常见部署问题

#### 📍 问题1: JSON解析错误 "Unexpected token '<'"
**原因：** API返回HTML而不是JSON
**解决方案：**
- 检查API路径是否正确
- 确认服务器正常启动
- 检查CORS配置

#### 📍 问题2: 学生登录失败
**原因：** 数据库连接或数据不一致
**解决方案：**
- 运行数据库初始化脚本
- 检查学生数据是否存在

#### 📍 问题3: 静态文件404
**原因：** 静态文件路径配置问题
**解决方案：**
- 检查public文件夹权限
- 确认Express静态文件配置

### 3. 部署前检查清单

运行部署检查脚本：
```bash
# 检查本地环境
node deploy-check.js

# 检查远程部署
node deploy-check.js https://your-domain.com
```

### 4. 数据库初始化

如果是全新部署，需要初始化数据：
```bash
npm run init-db
npm run seed
```

### 5. 生产环境优化

1. **启用PM2进程管理：**
```bash
npm install -g pm2
pm2 start server.js --name learning-platform
pm2 startup
pm2 save
```

2. **配置Nginx反向代理：**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **SSL证书配置：**
```bash
certbot --nginx -d your-domain.com
```

### 6. 监控和日志

1. **查看应用日志：**
```bash
pm2 logs learning-platform
```

2. **监控系统状态：**
```bash
pm2 monit
```

### 7. 故障排除命令

```bash
# 检查端口占用
lsof -i :3000

# 检查服务器进程
ps aux | grep node

# 测试API连接
curl -X GET http://localhost:3000/api

# 测试学生登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"20230001","password":"20230001","userType":"student"}'
```

### 8. 安全配置

生产环境务必：
- 更换JWT_SECRET为强密码
- 配置防火墙只开放必要端口
- 使用HTTPS
- 定期更新依赖包
- 备份数据库

### 9. 性能优化

- 启用gzip压缩
- 配置静态文件缓存
- 使用CDN
- 数据库索引优化
- 连接池配置