# 🔧 Render 部署问题修复指南

## 问题诊断

根据错误信息 `POST /api/auth/login 500 (Internal Server Error)`，这是服务器端错误。

## 修复步骤

### 1. 检查 Render 日志

在 Render 控制台中：
1. 进入您的服务详情页
2. 点击 "Logs" 标签
3. 查看具体的 500 错误信息

### 2. 数据库连接问题（最可能的原因）

Render 不支持本地 MongoDB，需要使用 MongoDB Atlas：

1. **创建 MongoDB Atlas 账户**
   - 访问 https://cloud.mongodb.com/
   - 创建免费集群

2. **获取连接字符串**
   - 格式：`mongodb+srv://username:password@cluster.mongodb.net/learning_platform`

3. **在 Render 中设置环境变量**
   - 进入 Render 控制台
   - 找到您的服务
   - 在 "Environment" 标签中添加：
     ```
     MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/learning_platform
     ```

### 3. 其他必需的环境变量

在 Render 环境变量中确保设置：

```bash
NODE_ENV=production
PORT=10000  # Render 自动设置
MONGODB_URI=your-mongodb-atlas-connection-string
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret
ALLOWED_ORIGINS=https://learning-platform-lqy1.onrender.com
```

### 4. 数据库初始化

如果使用新的 MongoDB Atlas 数据库：

1. 连接到您的 Atlas 数据库
2. 运行初始化脚本创建测试数据
3. 或者手动创建学生账户

### 5. 临时解决方案 - 创建测试用户

如果数据库为空，您可能需要先创建用户。在 MongoDB Atlas 中手动插入：

```javascript
// 插入到 students 集合
{
  "_id": ObjectId(),
  "studentId": "20230001",
  "name": "测试学生",
  "password": "$2a$10$encrypted_password_hash", // 需要加密
  "grade": "高一",
  "gender": "male",
  "dateOfBirth": new Date("2005-01-01"),
  "contactInfo": {
    "email": "student@test.com",
    "phone": ""
  },
  "enrollmentStatus": "enrolled",
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

### 6. 测试修复

部署后测试：
1. 访问健康检查：`https://learning-platform-lqy1.onrender.com/health`
2. 测试 API：`https://learning-platform-lqy1.onrender.com/api`
3. 尝试登录

### 7. 常见 Render 部署问题

1. **构建超时** - 在 `package.json` 中添加：
   ```json
   "engines": {
     "node": "18.x"
   }
   ```

2. **内存不足** - 免费计划有限制，优化代码减少内存使用

3. **文件权限** - 确保所有文件都提交到 Git

### 8. 调试命令

您可以在本地运行以下命令来模拟生产环境：

```bash
# 使用生产环境变量
NODE_ENV=production npm start

# 测试健康检查
curl https://learning-platform-lqy1.onrender.com/health

# 测试 API
curl https://learning-platform-lqy1.onrender.com/api
```

## 下一步行动

1. **立即检查** Render 控制台的日志
2. **设置** MongoDB Atlas 数据库
3. **更新** Render 环境变量
4. **重新部署** 应用

如果问题持续存在，请提供 Render 日志的具体错误信息，我可以进一步帮助诊断。