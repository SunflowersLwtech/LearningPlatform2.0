# 学习平台部署指南

## 📋 部署前准备

### 1. 数据库迁移

#### 选项A: MongoDB Atlas (推荐)
1. 访问 https://www.mongodb.com/atlas
2. 创建免费账户
3. 创建新集群
4. 获取连接字符串
5. 更新 .env.production 中的 MONGODB_URI

#### 选项B: 阿里云MongoDB
1. 登录阿里云控制台
2. 创建MongoDB实例
3. 配置白名单
4. 获取连接地址
5. 更新 .env.production 中的 MONGODB_URI

### 2. 数据导入
```bash
# 设置云数据库URI
export CLOUD_MONGODB_URI='your-cloud-mongodb-uri'

# 导入数据
./import-data.sh
```

## 🚀 部署方式

### 方式1: 传统服务器部署
```bash
# 1. 上传代码到服务器
scp -r . user@server:/path/to/app

# 2. 连接服务器
ssh user@server

# 3. 进入应用目录
cd /path/to/app

# 4. 运行部署脚本
./deploy.sh
```

### 方式2: Docker部署
```bash
# 1. 构建镜像
docker build -t learning-platform .

# 2. 运行容器
docker run -d -p 3000:3000 --env-file .env learning-platform

# 或使用docker-compose
docker-compose up -d
```

### 方式3: 云平台部署

#### Vercel部署
1. 安装Vercel CLI: `npm i -g vercel`
2. 登录: `vercel login`
3. 部署: `vercel`

#### Railway部署
1. 访问 https://railway.app
2. 连接GitHub仓库
3. 配置环境变量
4. 自动部署

#### Heroku部署
1. 安装Heroku CLI
2. 登录: `heroku login`
3. 创建应用: `heroku create your-app-name`
4. 配置环境变量: `heroku config:set MONGODB_URI=your-uri`
5. 部署: `git push heroku main`

## ⚙️ 环境变量配置

生产环境需要配置以下环境变量:
- `MONGODB_URI`: 云数据库连接字符串
- `JWT_SECRET`: JWT密钥
- `SESSION_SECRET`: Session密钥
- `NODE_ENV`: production

## 🔧 部署后检查

1. 访问应用URL
2. 测试登录功能
3. 检查数据库连接
4. 验证文件上传
5. 测试所有功能模块

## 📊 监控和维护

- 使用PM2进行进程管理
- 配置日志记录
- 设置健康检查
- 定期备份数据库

## 🆘 故障排除

常见问题和解决方案:
1. 数据库连接失败 - 检查URI和网络
2. 文件上传失败 - 检查目录权限
3. 登录问题 - 检查JWT配置
4. 静态资源404 - 检查静态文件配置
