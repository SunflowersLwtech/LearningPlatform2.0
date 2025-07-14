FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码
COPY . .

# 创建上传目录
RUN mkdir -p uploads/avatars uploads/general uploads/resources

# 设置权限
RUN chmod 755 uploads uploads/avatars uploads/general uploads/resources

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
