# 🚀 Render部署指南

**GitHub仓库**: https://github.com/SunflowersLwtech/LearningPlatform.git  
**部署平台**: Render.com  
**部署时间**: 2025年7月13日

## 📋 部署前准备

### ✅ 已完成
- ✅ 代码已上传到GitHub
- ✅ 所有功能已修复和测试
- ✅ 配置文件已准备
- ✅ 部署脚本已配置

### ⚠️ 需要准备
- MongoDB Atlas账户和数据库
- Render.com账户
- 环境变量配置

## 🎯 第一步：创建MongoDB Atlas数据库

### 1.1 注册MongoDB Atlas
1. 访问 https://www.mongodb.com/cloud/atlas
2. 点击 "Try Free" 注册免费账户
3. 选择 "Shared" 免费套餐
4. 选择云服务商和地区（推荐AWS，Singapore）

### 1.2 创建数据库集群
1. 创建新集群（免费M0套餐）
2. 设置用户名和密码（记住这些信息）
3. 添加IP地址：选择 "Allow access from anywhere" (0.0.0.0/0)
4. 等待集群创建完成（约2-3分钟）

### 1.3 获取连接字符串
1. 点击 "Connect" 按钮
2. 选择 "Connect your application"
3. 选择 "Node.js" 和版本 "4.1 or later"
4. 复制连接字符串，格式如下：
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## 🚀 第二步：在Render部署应用

### 2.1 注册Render账户
1. 访问 https://render.com
2. 点击 "Get Started" 注册账户
3. 选择 "GitHub" 登录（推荐）
4. 授权Render访问你的GitHub仓库

### 2.2 创建新的Web Service
1. 登录Render后，点击 "New +"
2. 选择 "Web Service"
3. 连接你的GitHub仓库：
   - 选择 "Connect a repository"
   - 找到并选择 "LearningPlatform" 仓库
   - 点击 "Connect"

### 2.3 配置部署设置
填写以下配置信息：

**基本设置**:
- **Name**: `learning-platform` (或你喜欢的名称)
- **Region**: `Singapore` (或离你最近的地区)
- **Branch**: `main`
- **Root Directory**: 留空
- **Runtime**: `Node`

**构建和部署设置**:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**实例类型**:
- 选择 "Free" 免费套餐

### 2.4 配置环境变量
在 "Environment Variables" 部分添加以下变量：

```bash
# 数据库连接
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/learning_platform?retryWrites=true&w=majority

# JWT密钥（生成一个随机字符串）
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Session密钥（生成一个随机字符串）
SESSION_SECRET=your_super_secret_session_key_here_make_it_long_and_random

# 环境设置
NODE_ENV=production

# 端口（Render会自动设置，但可以明确指定）
PORT=3000
```

**重要提示**:
- 将 `username:password` 替换为你的MongoDB用户名和密码
- 将 `cluster0.xxxxx.mongodb.net` 替换为你的实际集群地址
- JWT_SECRET和SESSION_SECRET应该是长随机字符串

### 2.5 开始部署
1. 检查所有配置无误
2. 点击 "Create Web Service"
3. Render会自动开始部署过程
4. 等待部署完成（通常需要3-5分钟）

## 📊 第三步：验证部署

### 3.1 检查部署状态
1. 在Render控制台查看部署日志
2. 确保没有错误信息
3. 等待状态变为 "Live"

### 3.2 访问应用
1. 部署成功后，Render会提供一个URL，格式如：
   `https://learning-platform-xxxx.onrender.com`
2. 点击URL访问你的应用
3. 应该能看到学习平台的登录页面

### 3.3 测试功能
使用以下测试账户登录：

**管理员账户**:
- 邮箱: `principal@school.edu`
- 密码: `admin123`

**教师账户**:
- 邮箱: `wang@school.edu`
- 密码: `admin123`

**学生账户**:
- 学号: `20230001`
- 密码: `20230001`

## 🔧 第四步：初始化数据（可选）

### 4.1 自动初始化
应用首次启动时会自动创建初始数据，包括：
- 管理员账户
- 示例教师和学生
- 基础课程和班级数据

### 4.2 手动初始化（如果需要）
如果自动初始化失败，可以通过以下方式手动初始化：

1. 在Render控制台的 "Shell" 中运行：
```bash
node scripts/initDb.js
node scripts/seed.js
```

## 🎯 第五步：配置自定义域名（可选）

### 5.1 购买域名
1. 从域名注册商购买域名（如Namecheap、GoDaddy等）

### 5.2 在Render配置域名
1. 在Render控制台，进入你的服务
2. 点击 "Settings" 标签
3. 在 "Custom Domains" 部分点击 "Add Custom Domain"
4. 输入你的域名（如 `learning.yourdomain.com`）
5. 按照指示配置DNS记录

### 5.3 配置DNS
在你的域名注册商处添加CNAME记录：
- **Name**: `learning` (或你选择的子域名)
- **Value**: `learning-platform-xxxx.onrender.com`

## 🔍 故障排除

### 常见问题和解决方案

#### 1. 部署失败
**问题**: 构建或部署过程中出现错误
**解决方案**:
- 检查Render控制台的部署日志
- 确保package.json中的依赖正确
- 检查Node.js版本兼容性

#### 2. 数据库连接失败
**问题**: 应用无法连接到MongoDB
**解决方案**:
- 检查MONGODB_URI环境变量是否正确
- 确保MongoDB Atlas的IP白名单包含0.0.0.0/0
- 验证数据库用户名和密码

#### 3. 应用启动失败
**问题**: 应用启动时出现错误
**解决方案**:
- 检查所有必需的环境变量是否已设置
- 查看应用日志中的具体错误信息
- 确保PORT环境变量正确设置

#### 4. 功能不正常
**问题**: 某些功能无法正常工作
**解决方案**:
- 检查浏览器控制台的错误信息
- 验证API端点是否正常响应
- 检查数据库中是否有必要的初始数据

## 📈 性能优化建议

### 1. 免费套餐限制
- Render免费套餐有以下限制：
  - 750小时/月的运行时间
  - 应用在无活动时会休眠
  - 从休眠状态唤醒需要30秒左右

### 2. 升级到付费套餐
如果需要更好的性能，可以考虑升级：
- **Starter**: $7/月，无休眠，更快的构建
- **Standard**: $25/月，更多资源，更好的性能

### 3. 数据库优化
- 使用MongoDB Atlas的免费M0套餐足够开发和小规模使用
- 如需更好性能，可升级到M2或更高套餐

## 🎉 部署完成

恭喜！你的学习平台现在已经成功部署到Render！

### 📋 部署总结
- ✅ 代码已上传到GitHub
- ✅ MongoDB Atlas数据库已配置
- ✅ Render Web Service已创建
- ✅ 环境变量已配置
- ✅ 应用已成功部署

### 🔗 重要链接
- **GitHub仓库**: https://github.com/SunflowersLwtech/LearningPlatform.git
- **Render应用**: https://learning-platform-xxxx.onrender.com
- **MongoDB Atlas**: https://cloud.mongodb.com

### 📞 获取帮助
如果遇到问题，可以：
1. 查看Render的官方文档
2. 检查GitHub仓库的README文件
3. 查看应用的部署日志

**🎊 你的学习平台现在已经在云端运行了！**
