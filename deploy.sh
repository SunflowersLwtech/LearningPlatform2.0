#!/bin/bash

# 学习平台部署脚本

echo "🚀 开始部署学习平台..."

# 1. 安装依赖
echo "📦 安装依赖..."
npm install --production

# 2. 创建必要目录
echo "📁 创建目录..."
mkdir -p uploads/avatars
mkdir -p uploads/general
mkdir -p uploads/resources
mkdir -p logs

# 3. 设置权限
echo "🔐 设置权限..."
chmod 755 uploads
chmod 755 uploads/avatars
chmod 755 uploads/general
chmod 755 uploads/resources

# 4. 复制生产环境配置
if [ -f ".env.production" ]; then
    echo "⚙️ 使用生产环境配置..."
    cp .env.production .env
else
    echo "⚠️ 警告: 没有找到生产环境配置文件"
fi

# 5. 测试数据库连接
echo "🗄️ 测试数据库连接..."
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ 数据库连接成功');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  });
"

if [ $? -eq 0 ]; then
    echo "✅ 数据库连接测试通过"
else
    echo "❌ 数据库连接测试失败，请检查配置"
    exit 1
fi

# 6. 启动应用
echo "🎯 启动应用..."
if command -v pm2 &> /dev/null; then
    echo "使用PM2启动..."
    pm2 start server.js --name "learning-platform"
    pm2 save
else
    echo "使用Node.js直接启动..."
    node server.js
fi

echo "🎉 部署完成！"
