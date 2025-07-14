# 学习平台管理系统 (Learning Platform Management System)

一个全面的教育管理系统，涵盖学校管理的各个核心环节。

## 系统模块

### 1. 校务与学籍管理 (Administration & Student Information)
- **学生信息管理**: 学籍档案、学籍异动管理
- **教职工管理**: 教师档案、权限分配
- **班级与课程管理**: 班级管理、排课系统、考勤管理

### 2. 教学过程管理 (Teaching & Instruction)
- **课程标准管理**: 内置国家/地方课程标准
- **备课功能**: 在线备课工具、集体备课支持
- **教学资源库**: 数字资源中心
- **作业与任务发布**: 在线作业管理

### 3. 学生学习与互动 (Learning & Interaction)
- **学生个人空间**: 个人仪表板
- **在线学习**: 课程材料访问
- **作业提交**: 多格式作业提交
- **在线讨论**: 师生互动平台

### 4. 评价与分析 (Assessment & Analytics)
- **成绩录入与管理**: 在线批改、成绩计算
- **在线测验**: 自动批改功能
- **学业报告**: 个人与班级分析报告

## 技术栈

- **后端**: Node.js + Express.js
- **数据库**: MongoDB + Mongoose
- **认证**: JWT + bcryptjs
- **文件上传**: Multer
- **实时通信**: Socket.io
- **前端**: HTML5 + Bootstrap 5 + Vanilla JavaScript
- **数据验证**: express-validator
- **API限流**: 自定义中间件

## 安装与运行

1. 克隆项目
```bash
git clone <repository-url>
cd LearningPlatform
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库连接等信息
```

4. 初始化数据库（可选）
```bash
npm run seed
```

5. 启动开发服务器
```bash
npm run dev
```

6. 生产环境运行
```bash
npm start
```

7. 访问系统
```
浏览器打开: http://localhost:3000
```

### 默认测试账号

**管理员账号:**
- 用户名: principal@school.edu
- 密码: admin123

**教师账号:**
- 用户名: wang@school.edu  
- 密码: admin123

**学生账号:**
- 用户名: 20230001
- 密码: 20230001

## API 文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 教职工注册
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息
- `PUT /api/auth/change-password` - 修改密码

### 学生管理
- `GET /api/students` - 获取学生列表
- `POST /api/students` - 创建学生
- `GET /api/students/:id` - 获取学生详情
- `PUT /api/students/:id` - 更新学生信息
- `PUT /api/students/:id/status` - 更新学籍状态

### 班级管理
- `GET /api/classes` - 获取班级列表
- `POST /api/classes` - 创建班级
- `GET /api/classes/:id` - 获取班级详情
- `PUT /api/classes/:id` - 更新班级信息
- `PUT /api/classes/:id/schedule` - 更新课表

### 课程管理
- `GET /api/courses` - 获取课程列表
- `POST /api/courses` - 创建课程
- `GET /api/courses/:id` - 获取课程详情
- `PUT /api/courses/:id` - 更新课程信息

### 作业管理
- `GET /api/assignments` - 获取作业列表
- `POST /api/assignments` - 创建作业
- `GET /api/assignments/:id` - 获取作业详情
- `PUT /api/assignments/:id` - 更新作业
- `PUT /api/assignments/:id/publish` - 发布作业

### 学习模块
- `GET /api/learning/dashboard` - 学生仪表板
- `GET /api/learning/assignments` - 学生作业列表
- `POST /api/learning/assignments/:id/submit` - 提交作业
- `GET /api/learning/resources` - 资源列表
- `GET /api/learning/discussions` - 讨论列表

### 数据分析
- `GET /api/analytics/student/:id/report` - 学生报告
- `GET /api/analytics/class/:id/report` - 班级报告
- `GET /api/analytics/grade-distribution` - 成绩分布
- `GET /api/analytics/attendance` - 考勤分析

## 用户角色与权限

### 教职工角色
- **校长** (principal): 系统最高权限
- **副校长** (vice_principal): 高级管理权限
- **主任** (director): 部门管理权限
- **班主任** (head_teacher): 班级管理权限
- **教师** (teacher): 教学相关权限
- **管理员** (admin): 系统管理权限

### 权限系统
- `canManageStudents`: 学生管理权限
- `canManageGrades`: 成绩管理权限
- `canManageSchedule`: 排课权限
- `canAccessReports`: 报告查看权限
- `canManageSystem`: 系统管理权限

## 数据模型

### 核心模型
- **Student**: 学生信息模型
- **Staff**: 教职工信息模型
- **Class**: 班级信息模型
- **Course**: 课程信息模型
- **Assignment**: 作业模型
- **Submission**: 作业提交模型
- **Grade**: 成绩模型
- **Attendance**: 考勤模型
- **Discussion**: 讨论模型
- **Resource**: 资源模型
- **Analytics**: 分析报告模型

## 开发规范

1. 所有API返回统一格式的JSON响应
2. 使用中间件进行认证和授权检查
3. 数据库操作使用Mongoose进行数据验证
4. 错误处理统一管理
5. 代码注释使用中文，便于维护

## 特色功能

1. **响应式设计**: 支持桌面端和移动端访问
2. **实时通知**: 基于Socket.io的实时消息推送
3. **角色权限**: 细粒度的权限控制系统
4. **数据分析**: 丰富的统计图表和报告
5. **文件管理**: 完整的文件上传和管理功能
6. **多语言支持**: 界面中文化
7. **数据导出**: 支持多种格式的数据导出

## 系统要求

- Node.js 16.0+
- MongoDB 4.4+
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

## 开发路线图

- [ ] 移动端应用
- [ ] 视频直播教学
- [ ] AI智能推荐
- [ ] 多租户支持
- [ ] 国际化支持

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License