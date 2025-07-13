// 显示登录模态框
function showLoginModal() {
    // 显示登录模态框
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        new bootstrap.Modal(loginModal).show();
    } else {
        // 登录模态框元素未找到
    }
}

// 显示注册模态框
function showRegisterModal() {
    // 显示注册模态框
    const registerModal = document.getElementById('registerModal');
    if (registerModal) {
        new bootstrap.Modal(registerModal).show();
    } else {
        // 注册模态框元素未找到
    }
}

// 为了向后兼容，也保持全局定义
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;

// 全局变量
let currentUser = null;
let authToken = null;

// API 基础URL
const API_BASE = '/api';

// 工具函数
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// 安全HTML处理函数 - 检查是否已存在以避免重复声明
if (!window.sanitizeHtml) {
    window.sanitizeHtml = function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
}

// 安全设置元素内容
const safeSetContent = (element, content, isHtml = false) => {
    if (typeof element === 'string') {
        element = $(element);
    }
    if (!element) {return;}
    
    if (isHtml) {
        // 只有明确标记为HTML的内容才使用innerHTML
        element.innerHTML = content;
    } else {
        // 默认使用textContent确保安全
        element.textContent = content;
    }
};

// HTTP 请求封装
const api = {
    async request(method, url, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${API_BASE}${url}`, options);
            
            // 检查响应内容类型
            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                // 如果不是JSON，获取文本内容
                const text = await response.text();
                result = { 
                    success: false, 
                    message: text.includes('<!DOCTYPE') ? '服务器返回了HTML页面，请检查API路径' : text
                };
            }

            if (!response.ok) {
                throw new Error(result.message || `请求失败 (${response.status})`);
            }

            return result;
        } catch (error) {
            showAlert(error.message, 'danger');
            throw error;
        }
    },

    async postFormData(url, formData) {
        const options = {
            method: 'POST',
            headers: {}
        };

        if (authToken) {
            options.headers.Authorization = `Bearer ${authToken}`;
        }

        // 不设置Content-Type，让浏览器自动设置multipart/form-data
        options.body = formData;

        try {
            const response = await fetch(`${API_BASE}${url}`, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '请求失败');
            }

            return result;
        } catch (error) {
            throw error;
        }
    },

    get(url) { return this.request('GET', url); },
    post(url, data) { return this.request('POST', url, data); },
    put(url, data) { return this.request('PUT', url, data); },
    delete(url) { return this.request('DELETE', url); }
};

// 显示提示信息
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${window.sanitizeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// 显示加载状态
function showLoading(container = '#content') {
    const loadingHtml = `
        <div class="loading">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
        </div>
    `;
    safeSetContent(container, loadingHtml, true);
}

// 初始化应用
function initApp() {
    // 检查本地存储的登录状态
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
        updateNavbar();
    }
    
    // 绑定事件
    bindEvents();
}

// 绑定事件
function bindEvents() {
    // 开始绑定事件

    // 登录按钮
    const loginBtn = $('#loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
        // 登录按钮事件已绑定
    }

    // 注册按钮
    const registerBtn = $('#registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', showRegisterModal);
        // 注册按钮事件已绑定
    }

    // 登录表单
    const loginForm = $('#loginForm');
    // 获取登录表单元素
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        // 登录表单事件已绑定
    }

    // 注册表单
    const registerForm = $('#registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        // 注册表单事件已绑定
    }

    // 注册表单中添加全局函数
    window.toggleRegistrationFields = toggleRegistrationFields;
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();

    // 登录表单提交事件触发

    const formData = {
        identifier: $('#identifier').value,
        password: $('#password').value,
        userType: $('#userType').value
    };

    // 准备登录数据

    try {
        // 发送登录请求
        const result = await api.post('/auth/login', formData);
        // 处理登录响应

        // 修复：使用正确的数据结构
        authToken = result.data.accessToken;
        currentUser = result.data.user;

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        bootstrap.Modal.getInstance($('#loginModal')).hide();

        showAlert('登录成功！', 'success');
        showDashboard();
        updateNavbar();
    } catch (error) {
        showAlert('登录失败：' + (error.response?.data?.message || error.message), 'danger');
    }
}

// 处理注册
// 注册表单字段切换
function toggleRegistrationFields() {
    const userType = $('#regUserType').value;
    const staffFields = $$('.staff-fields');
    const studentFields = $$('.student-fields');
    
    if (userType === 'staff') {
        staffFields.forEach(field => {
            field.style.display = 'block';
            const inputs = field.querySelectorAll('input, select');
            inputs.forEach(input => input.required = true);
        });
        studentFields.forEach(field => {
            field.style.display = 'none';
            const inputs = field.querySelectorAll('input, select');
            inputs.forEach(input => input.required = false);
        });
    } else if (userType === 'student') {
        staffFields.forEach(field => {
            field.style.display = 'none';
            const inputs = field.querySelectorAll('input, select');
            inputs.forEach(input => input.required = false);
        });
        studentFields.forEach(field => {
            field.style.display = 'block';
            const inputs = field.querySelectorAll('input, select');
            inputs.forEach(input => input.required = true);
        });
    } else {
        staffFields.forEach(field => field.style.display = 'none');
        studentFields.forEach(field => field.style.display = 'none');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const userType = $('#regUserType').value;
    if (!userType) {
        showAlert('请选择用户类型', 'warning');
        return;
    }
    
    // 验证密码匹配
    const password = $('#regPassword').value;
    const confirmPassword = $('#regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showAlert('密码和确认密码不匹配', 'warning');
        return;
    }

    const baseData = {
        name: $('#regName').value,
        email: $('#regEmail').value,
        password: password,
        confirmPassword: confirmPassword,
        userType: userType
    };
    
    let formData;
    if (userType === 'staff') {
        // 限制教职工只能注册为教师和班主任
        const role = $('#regRole').value;
        if (!['teacher', 'head_teacher'].includes(role)) {
            showAlert('教职工只能注册为教师或班主任', 'warning');
            return;
        }
        
        formData = {
            ...baseData,
            staffId: $('#regStaffId').value,
            role: role,
            department: $('#regDepartment').value
        };
    } else {
        formData = {
            ...baseData,
            studentId: $('#regStudentId').value,
            grade: $('#regGrade').value,
            gender: $('#regGender').value
        };
    }
    
    try {
        const result = await api.post('/auth/register', formData);
        
        bootstrap.Modal.getInstance($('#registerModal')).hide();
        showAlert(`${userType === 'staff' ? '教职工' : '学生'}注册成功！请登录`, 'success');
        
        // 清空表单
        document.getElementById('registerForm').reset();
        toggleRegistrationFields();
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || '注册失败';
        showAlert(errorMessage, 'danger');
    }
}

// 更新导航栏
function updateNavbar() {
    if (currentUser) {
        $('#navbarAuth').classList.add('d-none');
        $('#navbarUser').classList.remove('d-none');
        $('#userName').textContent = currentUser.name;
        $('#sidebar').classList.remove('d-none');
        $('#welcomeSection').classList.add('d-none');
        
        // 根据用户类型显示/隐藏菜单项
        if (currentUser.userType === 'student') {
            $$('.staff-only').forEach(item => item.classList.add('d-none'));
        }
    } else {
        $('#navbarAuth').classList.remove('d-none');
        $('#navbarUser').classList.add('d-none');
        $('#sidebar').classList.add('d-none');
        $('#welcomeSection').classList.remove('d-none');
        $('#dashboardContent').classList.add('d-none');
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    
    updateNavbar();
    safeSetContent('#content', '');
    showAlert('已退出登录', 'info');
}

// 模态框函数已在文件开头定义

// 显示仪表板
async function showDashboard() {
    if (!currentUser) {return;}

    $('#dashboardContent').classList.remove('d-none');
    showLoading('#dashboardContent');

    try {
        let dashboardHtml = '';

        // 修复：使用userType字段来判断用户类型
        if (currentUser.userType === 'student') {
            const data = await api.get('/learning/dashboard');
            dashboardHtml = renderStudentDashboard(data.data);
        } else {
            dashboardHtml = renderStaffDashboard();
        }

        safeSetContent('#dashboardContent', dashboardHtml, true);

        // 设置活动导航
        setActiveNav('仪表板');
    } catch (error) {
        console.error('加载仪表板失败:', error);
        safeSetContent('#dashboardContent', `<div class="alert alert-danger">加载仪表板失败: ${window.sanitizeHtml(error.message || '未知错误')}</div>`, true);
    }
}

// 渲染学生仪表板
function renderStudentDashboard(data) {
    return `
        <div class="row">
            <div class="col-12">
                <h2 class="mb-4">学生仪表板</h2>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-tasks me-2"></i>待完成作业</h5>
                    </div>
                    <div class="card-body">
                        ${data.pendingAssignments.length === 0 ? 
                            '<p class="text-muted">暂无待完成作业</p>' :
                            data.pendingAssignments.map(assignment => `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <strong>${assignment.title}</strong>
                                        <small class="text-muted d-block">${assignment.course.name}</small>
                                    </div>
                                    <span class="badge bg-warning">${formatDate(assignment.dueDate)}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
            
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-chart-line me-2"></i>最近成绩</h5>
                    </div>
                    <div class="card-body">
                        ${data.recentSubmissions.length === 0 ? 
                            '<p class="text-muted">暂无成绩记录</p>' :
                            data.recentSubmissions.map(submission => `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <strong>${submission.assignment.title}</strong>
                                        <small class="text-muted d-block">${submission.assignment.type}</small>
                                    </div>
                                    <span class="badge bg-${submission.grade?.percentage >= 80 ? 'success' : submission.grade?.percentage >= 60 ? 'warning' : 'danger'}">
                                        ${submission.grade?.percentage || '未评分'}
                                    </span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-comments me-2"></i>活跃讨论</h5>
                    </div>
                    <div class="card-body">
                        ${data.activeDiscussions.length === 0 ? 
                            '<p class="text-muted">暂无活跃讨论</p>' :
                            data.activeDiscussions.map(discussion => `
                                <div class="mb-3 p-3 border rounded">
                                    <h6>${discussion.title}</h6>
                                    <small class="text-muted">最后活动: ${formatDate(discussion.lastActivity)}</small>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 渲染教职工仪表板
function renderStaffDashboard() {
    return `
        <div class="row">
            <div class="col-12">
                <h2 class="mb-4">教职工仪表板</h2>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-3 mb-4">
                <div class="card stats-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6 class="card-title text-muted">我的课程</h6>
                                <h3 class="mb-0">5</h3>
                            </div>
                            <i class="fas fa-book fa-2x text-primary"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-4">
                <div class="card stats-card success">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6 class="card-title text-muted">我的学生</h6>
                                <h3 class="mb-0">120</h3>
                            </div>
                            <i class="fas fa-users fa-2x text-success"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-4">
                <div class="card stats-card warning">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6 class="card-title text-muted">待批改</h6>
                                <h3 class="mb-0">15</h3>
                            </div>
                            <i class="fas fa-edit fa-2x text-warning"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-4">
                <div class="card stats-card info">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6 class="card-title text-muted">本月课时</h6>
                                <h3 class="mb-0">32</h3>
                            </div>
                            <i class="fas fa-clock fa-2x text-info"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-8 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">今日课程安排</h5>
                    </div>
                    <div class="card-body">
                        <div class="timeline">
                            <div class="timeline-item">
                                <div class="card-body">
                                    <h6>08:00 - 09:40</h6>
                                    <p class="mb-1">高一数学 - 高一(1)班</p>
                                    <small class="text-muted">教学楼A栋 101室</small>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="card-body">
                                    <h6>10:00 - 11:40</h6>
                                    <p class="mb-1">高一数学 - 高一(2)班</p>
                                    <small class="text-muted">教学楼A栋 102室</small>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="card-body">
                                    <h6>14:00 - 15:40</h6>
                                    <p class="mb-1">高二数学 - 高二(1)班</p>
                                    <small class="text-muted">教学楼A栋 201室</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">快捷操作</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary" onclick="showAssignmentManagement()">
                                <i class="fas fa-plus me-2"></i>创建作业
                            </button>
                            <button class="btn btn-success" onclick="showStudentManagement()">
                                <i class="fas fa-user-plus me-2"></i>添加学生
                            </button>
                            <button class="btn btn-info" onclick="showAnalytics()">
                                <i class="fas fa-chart-bar me-2"></i>查看报告
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 学生管理功能
async function showStudentManagement() {
    setActiveNav('学生管理');
    showLoading('#dashboardContent');
    
    try {
        const response = await api.get('/students?page=1&limit=20');
        const students = response.data;
        const pagination = response.pagination;
        
        safeSetContent('#dashboardContent', `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-users me-2"></i>学生管理</h2>
                <button class="btn btn-primary" onclick="showAddStudentModal()">
                    <i class="fas fa-plus me-2"></i>添加学生
                </button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="row">
                        <div class="col-md-6">
                            <h5 class="mb-0">学生列表</h5>
                        </div>
                        <div class="col-md-6">
                            <div class="search-box">
                                <i class="fas fa-search search-icon"></i>
                                <input type="text" class="form-control" placeholder="搜索学生..." id="studentSearch">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>学号</th>
                                    <th>姓名</th>
                                    <th>性别</th>
                                    <th>年级</th>
                                    <th>班级</th>
                                    <th>入学状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(student => `
                                    <tr>
                                        <td>${student.studentId}</td>
                                        <td>${student.name}</td>
                                        <td>${student.gender === 'male' ? '男' : '女'}</td>
                                        <td>${student.grade}</td>
                                        <td>${student.class?.name || '未分班'}</td>
                                        <td>
                                            <span class="badge bg-${getStatusColor(student.enrollmentStatus)}">
                                                ${getStatusText(student.enrollmentStatus)}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-primary me-1" onclick="viewStudent('${student._id}')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-warning me-1" onclick="editStudent('${student._id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${student._id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    ${pagination ? `
                        <nav class="mt-3">
                            <ul class="pagination justify-content-center">
                                <li class="page-item ${pagination.currentPage === 1 ? 'disabled' : ''}">
                                    <a class="page-link" href="#" onclick="loadStudentPage(${pagination.currentPage - 1})">上一页</a>
                                </li>
                                ${Array.from({length: pagination.totalPages}, (_, i) => i + 1).map(page => `
                                    <li class="page-item ${page === pagination.currentPage ? 'active' : ''}">
                                        <a class="page-link" href="#" onclick="loadStudentPage(${page})">${page}</a>
                                    </li>
                                `).join('')}
                                <li class="page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}">
                                    <a class="page-link" href="#" onclick="loadStudentPage(${pagination.currentPage + 1})">下一页</a>
                                </li>
                            </ul>
                        </nav>
                    ` : ''}
                </div>
            </div>
        `, true);
        
        // 绑定搜索事件
        $('#studentSearch').addEventListener('input', debounce(searchStudents, 300));
        
    } catch (error) {
        safeSetContent('#dashboardContent', '<div class="alert alert-danger">加载学生数据失败</div>', true);
    }
}

// 班级管理功能
async function showClassManagement() {
    setActiveNav('班级管理');
    showLoading('#dashboardContent');
    
    try {
        const response = await api.get('/classes');
        const classes = response.data;
        
        safeSetContent('#dashboardContent', `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-school me-2"></i>班级管理</h2>
                <button class="btn btn-primary" onclick="showAddClassModal()">
                    <i class="fas fa-plus me-2"></i>创建班级
                </button>
            </div>
            
            <div class="row">
                ${classes.map(cls => `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="mb-0">${cls.name}</h5>
                                <small class="text-muted">${cls.grade} - ${cls.academicYear}学年</small>
                            </div>
                            <div class="card-body">
                                <div class="row text-center mb-3">
                                    <div class="col-6">
                                        <h4 class="text-primary">${cls.currentEnrollment}</h4>
                                        <small class="text-muted">当前人数</small>
                                    </div>
                                    <div class="col-6">
                                        <h4 class="text-success">${cls.capacity}</h4>
                                        <small class="text-muted">容量</small>
                                    </div>
                                </div>
                                
                                <div class="mb-2">
                                    <strong>班主任:</strong> ${cls.headTeacher?.name || '未分配'}
                                </div>
                                
                                <div class="mb-2">
                                    <strong>教室:</strong> ${cls.classroom ? `${cls.classroom.building}${cls.classroom.room}` : '未分配'}
                                </div>
                                
                                <div class="progress mb-2">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${(cls.currentEnrollment / cls.capacity) * 100}%">
                                    </div>
                                </div>
                                <small class="text-muted">班级容量利用率</small>
                            </div>
                            <div class="card-footer">
                                <div class="btn-group w-100" role="group">
                                    <button class="btn btn-outline-primary" onclick="viewClass('${cls._id}')">
                                        <i class="fas fa-eye"></i> 详情
                                    </button>
                                    <button class="btn btn-outline-warning" onclick="editClass('${cls._id}')">
                                        <i class="fas fa-edit"></i> 编辑
                                    </button>
                                    <button class="btn btn-outline-info" onclick="manageSchedule('${cls._id}')">
                                        <i class="fas fa-calendar"></i> 课表
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `, true);
        
    } catch (error) {
        safeSetContent('#dashboardContent', '<div class="alert alert-danger">加载班级数据失败</div>', true);
    }
}

// 课程管理功能
async function showCourseManagement() {
    setActiveNav('课程管理');
    showLoading('#dashboardContent');
    
    try {
        const response = await api.get('/courses');
        const courses = response.data;
        
        safeSetContent('#dashboardContent', `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-book me-2"></i>课程管理</h2>
                <button class="btn btn-primary" onclick="showAddCourseModal()">
                    <i class="fas fa-plus me-2"></i>创建课程
                </button>
            </div>
            
            <div class="row">
                ${courses.map(course => `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="mb-0">${course.name}</h5>
                                <span class="badge bg-primary">${course.subject}</span>
                            </div>
                            <div class="card-body">
                                <p><strong>年级:</strong> ${course.grade}</p>
                                <p><strong>学期:</strong> ${course.semester}</p>
                                <p><strong>学年:</strong> ${course.academicYear}</p>
                                <p><strong>教师:</strong> ${course.teacher?.name || '未分配'}</p>
                                <p><strong>选课班级:</strong> ${course.enrolledClasses?.length || 0} 个</p>
                                <p class="text-muted">${course.description || '暂无描述'}</p>
                            </div>
                            <div class="card-footer">
                                <div class="btn-group w-100" role="group">
                                    <button class="btn btn-outline-primary" onclick="viewCourse('${course._id}')">
                                        <i class="fas fa-eye"></i> 详情
                                    </button>
                                    <button class="btn btn-outline-warning" onclick="editCourse('${course._id}')">
                                        <i class="fas fa-edit"></i> 编辑
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `, true);
        
    } catch (error) {
        safeSetContent('#dashboardContent', '<div class="alert alert-danger">加载课程数据失败</div>', true);
    }
}

// 作业管理功能
async function showAssignmentManagement() {
    setActiveNav('作业管理');
    showLoading('#dashboardContent');
    
    try {
        const response = await api.get('/assignments');
        const assignments = response.data;
        
        safeSetContent('#dashboardContent', `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-tasks me-2"></i>作业管理</h2>
                <button class="btn btn-primary" onclick="showAddAssignmentModal()">
                    <i class="fas fa-plus me-2"></i>创建作业
                </button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>标题</th>
                                    <th>课程</th>
                                    <th>类型</th>
                                    <th>截止日期</th>
                                    <th>状态</th>
                                    <th>提交数</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${assignments.map(assignment => `
                                    <tr>
                                        <td>${assignment.title}</td>
                                        <td>${assignment.course?.name || '未知课程'}</td>
                                        <td>
                                            <span class="badge bg-secondary">${getAssignmentTypeText(assignment.type)}</span>
                                        </td>
                                        <td>${formatDate(assignment.dueDate)}</td>
                                        <td>
                                            <span class="badge bg-${assignment.isPublished ? 'success' : 'warning'}">
                                                ${assignment.isPublished ? '已发布' : '草稿'}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge bg-info">0 / 0</span>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-primary me-1" onclick="viewAssignment('${assignment._id}')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-warning me-1" onclick="editAssignment('${assignment._id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-success" onclick="gradeAssignment('${assignment._id}')">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `, true);
        
    } catch (error) {
        safeSetContent('#dashboardContent', '<div class="alert alert-danger">加载作业数据失败</div>', true);
    }
}

// 数据分析功能
async function showAnalytics() {
    setActiveNav('数据分析');
    showLoading('#dashboardContent');
    
    try {
        // 获取统计数据
        const statsResponse = await api.get('/analytics/stats');
        const stats = statsResponse.data;
        
        safeSetContent('#dashboardContent', `
            <div class="row">
                <div class="col-12">
                    <h2 class="mb-4"><i class="fas fa-chart-bar me-2"></i>数据分析</h2>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-3 mb-4">
                    <div class="card stats-card">
                        <div class="card-body text-center">
                            <h3 class="text-primary" id="totalStudents">${stats.totalStudents || 0}</h3>
                            <p class="mb-0">学生总数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stats-card success">
                        <div class="card-body text-center">
                            <h3 class="text-success" id="totalClasses">${stats.totalClasses || 0}</h3>
                            <p class="mb-0">班级数量</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stats-card warning">
                        <div class="card-body text-center">
                            <h3 class="text-warning" id="pendingAssignments">${stats.pendingAssignments || 0}</h3>
                            <p class="mb-0">待批改作业</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stats-card info">
                        <div class="card-body text-center">
                            <h3 class="text-info" id="averageAttendance">${stats.averageAttendance || 0}%</h3>
                            <p class="mb-0">平均出勤率</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">年级分布</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="gradeChart" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">成绩分布</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="gradeDistributionChart" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">月度作业提交趋势</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="submissionTrendChart" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">课程活跃度</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="courseActivityChart" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `, true);
        
        // 初始化图表
        await initializeCharts(stats);
        
    } catch (error) {
        showAlert('加载数据分析失败', 'danger');
        safeSetContent('#dashboardContent', `
            <div class="alert alert-danger">
                <h4>加载失败</h4>
                <p>无法获取统计数据，请稍后重试。</p>
            </div>
        `, true);
    }
}

// 初始化所有图表
async function initializeCharts(stats) {
    // 年级分布饼图
    const gradeCtx = document.getElementById('gradeChart').getContext('2d');
    new Chart(gradeCtx, {
        type: 'doughnut',
        data: {
            labels: stats.gradeDistribution?.map(item => `${item._id}年级`) || ['一年级', '二年级', '三年级'],
            datasets: [{
                data: stats.gradeDistribution?.map(item => item.count) || [20, 25, 15],
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
                hoverBackgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // 成绩分布柱状图
    const gradeDistCtx = document.getElementById('gradeDistributionChart').getContext('2d');
    new Chart(gradeDistCtx, {
        type: 'bar',
        data: {
            labels: ['优秀 (A)', '良好 (B)', '中等 (C)', '需改进 (D/F)'],
            datasets: [{
                label: '学生人数',
                data: [
                    stats.gradeStats?.excellent || 25,
                    stats.gradeStats?.good || 20,
                    stats.gradeStats?.average || 10,
                    stats.gradeStats?.poor || 5
                ],
                backgroundColor: [
                    '#28a745', '#007bff', '#ffc107', '#dc3545'
                ],
                borderColor: [
                    '#1e7e34', '#0056b3', '#d39e00', '#b21f2d'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // 作业提交趋势线图
    const submissionCtx = document.getElementById('submissionTrendChart').getContext('2d');
    const submissionData = stats.submissionTrend || generateMockSubmissionData();
    new Chart(submissionCtx, {
        type: 'line',
        data: {
            labels: submissionData.labels,
            datasets: [{
                label: '作业提交数',
                data: submissionData.data,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // 课程活跃度雷达图
    const activityCtx = document.getElementById('courseActivityChart').getContext('2d');
    const courseData = stats.courseActivity || generateMockCourseData();
    new Chart(activityCtx, {
        type: 'radar',
        data: {
            labels: courseData.labels,
            datasets: [{
                label: '活跃度指数',
                data: courseData.data,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                line: {
                    borderWidth: 3
                }
            }
        }
    });
}

// 生成模拟作业提交数据
function generateMockSubmissionData() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const data = [45, 52, 48, 61, 58, 67];
    return { labels: months, data: data };
}

// 生成模拟课程活跃度数据
function generateMockCourseData() {
    const subjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
    const data = [85, 92, 78, 88, 83, 79];
    return { labels: subjects, data: data };
}

// 资源库功能
async function showResources() {
    setActiveNav('资源库');
    showLoading('#dashboardContent');
    
    try {
        const response = await api.get('/learning/resources');
        const resources = response.data;
        
        safeSetContent('#dashboardContent', `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-folder-open me-2"></i>资源库</h2>
                <button class="btn btn-primary" onclick="showUploadResourceModal()">
                    <i class="fas fa-upload me-2"></i>上传资源
                </button>
            </div>
            
            <div class="row">
                ${resources.map(resource => `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-3">
                                    <i class="fas fa-${getFileIcon(resource.type)} fa-2x text-primary me-3"></i>
                                    <div>
                                        <h6 class="mb-0">${resource.title}</h6>
                                        <small class="text-muted">${resource.type}</small>
                                    </div>
                                </div>
                                <p class="text-muted small">${resource.description || '暂无描述'}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="badge bg-secondary">${resource.subject}</span>
                                    <small class="text-muted">${resource.downloads} 下载</small>
                                </div>
                            </div>
                            <div class="card-footer">
                                <button class="btn btn-primary btn-sm w-100" onclick="downloadResource('${resource._id}')">
                                    <i class="fas fa-download me-1"></i>下载
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `, true);
        
    } catch (error) {
        safeSetContent('#dashboardContent', '<div class="alert alert-danger">加载资源数据失败</div>', true);
    }
}

// 讨论区功能
async function showDiscussions() {
    setActiveNav('讨论区');
    showLoading('#dashboardContent');
    
    try {
        const response = await api.get('/learning/discussions');
        const discussions = response.data;
        
        safeSetContent('#dashboardContent', `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-comments me-2"></i>讨论区</h2>
                <button class="btn btn-primary" onclick="showCreateDiscussionModal()">
                    <i class="fas fa-plus me-2"></i>创建讨论
                </button>
            </div>
            
            <div class="row">
                ${discussions.map(discussion => `
                    <div class="col-12 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 class="mb-1">
                                            <a href="#" onclick="viewDiscussion('${discussion._id}')" class="text-decoration-none">
                                                ${discussion.title}
                                            </a>
                                        </h5>
                                        <p class="text-muted mb-1">${(discussion.content || discussion.description || '暂无描述').substring(0, 100)}${(discussion.content || discussion.description || '').length > 100 ? '...' : ''}</p>
                                        <small class="text-muted">
                                            由 ${discussion.creator?.name || '匿名'} 创建 · 
                                            ${formatDate(discussion.createdAt)} · 
                                            ${discussion.posts?.length || 0} 回复
                                        </small>
                                    </div>
                                    <div class="text-end">
                                        <span class="badge bg-${discussion.type === 'announcement' ? 'warning' : 'primary'}">
                                            ${getDiscussionTypeText(discussion.type)}
                                        </span>
                                        <br>
                                        <small class="text-muted">最后活动: ${formatDate(discussion.lastActivity)}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `, true);
        
    } catch (error) {
        safeSetContent('#dashboardContent', '<div class="alert alert-danger">加载讨论数据失败</div>', true);
    }
}

function showProfile() {
    setActiveNav('个人资料');
    showLoading('#dashboardContent');
    
    const userType = currentUser?.userType === 'staff' ? 'staff' : 'student';
    
    safeSetContent('#dashboardContent', `
        <div class="row">
            <div class="col-12">
                <h2 class="mb-4"><i class="fas fa-user-edit me-2"></i>个人资料</h2>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">头像设置</h5>
                    </div>
                    <div class="card-body text-center">
                        <div class="avatar-upload mb-3">
                            <div class="avatar-preview">
                                <img id="profileAvatar" src="/images/default-avatar.png" 
                                     alt="头像" class="rounded-circle" style="width: 150px; height: 150px; object-fit: cover;">
                            </div>
                            <div class="avatar-edit mt-3">
                                <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                                <button class="btn btn-primary" onclick="$('#avatarInput').click()">
                                    <i class="fas fa-camera me-1"></i>更换头像
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">基本信息</h5>
                        <button class="btn btn-outline-primary btn-sm" onclick="editProfile()">
                            <i class="fas fa-edit me-1"></i>编辑
                        </button>
                    </div>
                    <div class="card-body">
                        <div id="profileInfo">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>姓名:</strong> <span id="profileName">${currentUser?.name || '未设置'}</span></p>
                                    <p><strong>${userType === 'staff' ? '工号' : '学号'}:</strong> 
                                       <span id="profileId">${currentUser?.staffId || currentUser?.studentId || '未设置'}</span></p>
                                    <p><strong>邮箱:</strong> <span id="profileEmail">${currentUser?.email || '未设置'}</span></p>
                                </div>
                                <div class="col-md-6">
                                    ${userType === 'staff' ? `
                                        <p><strong>角色:</strong> <span id="profileRole">${getRoleText(currentUser?.role)}</span></p>
                                        <p><strong>部门:</strong> <span id="profileDepartment">${currentUser?.department || '未设置'}</span></p>
                                        <p><strong>职位:</strong> <span id="profilePosition">${currentUser?.position || '未设置'}</span></p>
                                    ` : `
                                        <p><strong>年级:</strong> <span id="profileGrade">${currentUser?.grade || '未设置'}</span></p>
                                        <p><strong>班级:</strong> <span id="profileClass">${currentUser?.class?.name || '未分班'}</span></p>
                                        <p><strong>状态:</strong> <span id="profileStatus">${getStatusText(currentUser?.enrollmentStatus)}</span></p>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0">安全设置</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center py-2">
                            <div>
                                <strong>密码</strong>
                                <small class="text-muted d-block">定期更换密码以保护账户安全</small>
                            </div>
                            <button class="btn btn-outline-warning btn-sm" onclick="changePassword()">
                                <i class="fas fa-key me-1"></i>修改密码
                            </button>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between align-items-center py-2">
                            <div>
                                <strong>登录记录</strong>
                                <small class="text-muted d-block">查看最近的登录活动</small>
                            </div>
                            <button class="btn btn-outline-info btn-sm" onclick="viewLoginHistory()">
                                <i class="fas fa-history me-1"></i>查看记录
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `, true);
    
    // 绑定头像上传事件
    $('#avatarInput').addEventListener('change', handleAvatarUpload);
}

// 编辑个人资料
function editProfile() {
    const userType = currentUser?.userType === 'staff' ? 'staff' : 'student';
    
    cleanupModal('editProfileModal');
    const modalHtml = `
        <div class="modal fade" id="editProfileModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">编辑个人资料</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editProfileForm">
                            <div class="mb-3">
                                <label class="form-label">姓名</label>
                                <input type="text" class="form-control" name="name" 
                                       value="${currentUser?.name || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">邮箱</label>
                                <input type="email" class="form-control" name="email" 
                                       value="${currentUser?.email || ''}" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">联系电话</label>
                                <input type="tel" class="form-control" name="phone" 
                                       value="${currentUser?.phone || ''}">
                            </div>
                            ${userType === 'staff' ? `
                                <div class="mb-3">
                                    <label class="form-label">部门</label>
                                    <input type="text" class="form-control" name="department" 
                                           value="${currentUser?.department || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">职位</label>
                                    <input type="text" class="form-control" name="position" 
                                           value="${currentUser?.position || ''}">
                                </div>
                            ` : ''}
                            <div class="mb-3">
                                <label class="form-label">个人简介</label>
                                <textarea class="form-control" name="bio" rows="3" 
                                          placeholder="介绍一下自己...">${currentUser?.bio || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" onclick="submitProfileEdit()">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal($('#editProfileModal')).show();
}

// 提交个人资料编辑
async function submitProfileEdit() {
    try {
        const form = $('#editProfileForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        const userType = currentUser?.userType === 'staff' ? 'staff' : 'students';
        const endpoint = userType === 'staff' ? `/staff/${currentUser.id}` : `/students/me`;
        
        const response = await api.put(endpoint, data);
        
        // 更新本地用户信息
        Object.assign(currentUser, data);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        bootstrap.Modal.getInstance($('#editProfileModal')).hide();
        showAlert('个人资料更新成功', 'success');
        showProfile(); // 刷新页面
        
    } catch (error) {
        showAlert('更新个人资料失败', 'danger');
    }
}

// 处理头像上传
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) {return;}
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showAlert('请选择图片文件', 'danger');
        return;
    }
    
    // 验证文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
        showAlert('图片大小不能超过2MB', 'danger');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('avatar', file);
        
        // 这里应该调用头像上传API
        // const response = await api.post('/upload/avatar', formData);
        
        // 暂时显示本地预览
        const reader = new FileReader();
        reader.onload = function(e) {
            $('#profileAvatar').src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        showAlert('头像更新成功', 'success');
        
    } catch (error) {
        showAlert('头像上传失败', 'danger');
    }
}

// 修改密码
function changePassword() {
    cleanupModal('changePasswordModal');
    const modalHtml = `
        <div class="modal fade" id="changePasswordModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">修改密码</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="changePasswordForm">
                            <div class="mb-3">
                                <label class="form-label">当前密码</label>
                                <input type="password" class="form-control" name="currentPassword" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">新密码</label>
                                <input type="password" class="form-control" name="newPassword" 
                                       minlength="6" required>
                                <small class="text-muted">密码长度至少6位</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">确认新密码</label>
                                <input type="password" class="form-control" name="confirmPassword" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" onclick="submitPasswordChange()">确认修改</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal($('#changePasswordModal')).show();
}

// 提交密码修改
async function submitPasswordChange() {
    try {
        const form = $('#changePasswordForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (data.newPassword !== data.confirmPassword) {
            showAlert('两次输入的新密码不一致', 'danger');
            return;
        }
        
        await api.put('/auth/change-password', {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword
        });
        
        bootstrap.Modal.getInstance($('#changePasswordModal')).hide();
        showAlert('密码修改成功，请重新登录', 'success');
        
        // 延迟后自动退出登录
        setTimeout(() => {
            logout();
        }, 2000);
        
    } catch (error) {
        showAlert('密码修改失败，请检查当前密码是否正确', 'danger');
    }
}

// 查看登录记录
async function viewLoginHistory() {
    try {
        const response = await api.get('/auth/login-history');
        const history = response.data;
        
        cleanupModal('loginHistoryModal');
        const modalHtml = `
            <div class="modal fade" id="loginHistoryModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">登录记录</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>登录时间</th>
                                            <th>IP地址</th>
                                            <th>设备信息</th>
                                            <th>状态</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${history.length > 0 ? history.map(record => `
                                            <tr>
                                                <td>${formatDateTime(record.loginTime)}</td>
                                                <td>${record.ipAddress || '未知'}</td>
                                                <td>${record.userAgent || '未知设备'}</td>
                                                <td>
                                                    <span class="badge bg-${record.success ? 'success' : 'danger'}">
                                                        ${record.success ? '成功' : '失败'}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="4" class="text-center text-muted">暂无登录记录</td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#loginHistoryModal')).show();
        
    } catch (error) {
        showAlert('获取登录记录失败', 'danger');
    }
}

// 获取角色文本
function getRoleText(role) {
    const roleMap = {
        'admin': '管理员',
        'principal': '校长',
        'director': '主任',
        'head_teacher': '班主任',
        'teacher': '教师'
    };
    return roleMap[role] || role || '未设置';
}

// 设置活动导航
function setActiveNav(text) {
    $$('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.textContent.trim().includes(text)) {
            link.classList.add('active');
        }
    });
}

// 工具函数
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// 状态相关工具函数
function getStatusColor(status) {
    const statusColors = {
        'enrolled': 'success',
        'pending': 'warning', 
        'graduated': 'secondary',
        'dropped': 'danger',
        'transferred': 'info'
    };
    return statusColors[status] || 'secondary';
}

function getStatusText(status) {
    const statusTexts = {
        'enrolled': '在读',
        'pending': '待确认',
        'graduated': '已毕业', 
        'dropped': '退学',
        'transferred': '转学'
    };
    return statusTexts[status] || '未知';
}

function getAssignmentTypeText(type) {
    const typeTexts = {
        'homework': '作业',
        'exam': '考试',
        'project': '项目',
        'quiz': '测验',
        'lab': '实验'
    };
    return typeTexts[type] || '其他';
}

function getFileIcon(type) {
    const fileIcons = {
        'pdf': 'file-pdf',
        'doc': 'file-word',
        'docx': 'file-word',
        'xls': 'file-excel', 
        'xlsx': 'file-excel',
        'ppt': 'file-powerpoint',
        'pptx': 'file-powerpoint',
        'txt': 'file-alt',
        'image': 'file-image',
        'video': 'file-video',
        'audio': 'file-audio',
        'zip': 'file-archive',
        'rar': 'file-archive'
    };
    return fileIcons[type] || 'file';
}

function getDiscussionTypeText(type) {
    const typeTexts = {
        'general': '一般讨论',
        'qa': '问答',
        'announcement': '公告',
        'homework': '作业讨论',
        'study': '学习交流'
    };
    return typeTexts[type] || '其他';
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 分页和搜索函数
async function loadStudentPage(page) {
    try {
        const searchTerm = $('#studentSearch')?.value || '';
        const url = `/students?page=${page}&limit=20${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
        const response = await api.get(url);
        
        // 重新渲染学生管理页面，只更新表格部分
        showStudentManagement();
    } catch (error) {
        showAlert('加载学生数据失败', 'danger');
    }
}

async function searchStudents() {
    try {
        const searchTerm = $('#studentSearch').value;
        const url = `/students?page=1&limit=20${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
        const response = await api.get(url);
        
        // 重新渲染学生管理页面
        showStudentManagement();
    } catch (error) {
        showAlert('搜索学生失败', 'danger');
    }
}

// 清理已存在的模态框
function cleanupModal(modalId) {
    const existingModal = $(`#${modalId}`);
    if (existingModal) {
        const bootstrapModal = bootstrap.Modal.getInstance(existingModal);
        if (bootstrapModal) {
            bootstrapModal.dispose();
        }
        existingModal.remove();
    }
}

// 模态框函数
async function showAddStudentModal() {
    try {
        // 获取班级列表用于下拉选择
        const classesResponse = await api.get('/classes');
        const classes = classesResponse.data;
        
        cleanupModal('addStudentModal');
        const modalHtml = `
            <div class="modal fade" id="addStudentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">添加学生</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addStudentForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">学号 <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" name="studentId" required placeholder="例: 20240001">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">姓名 <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" name="name" required placeholder="请输入学生姓名">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">性别 <span class="text-danger">*</span></label>
                                            <select class="form-control" name="gender" required>
                                                <option value="">请选择性别</option>
                                                <option value="male">男</option>
                                                <option value="female">女</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">出生日期 <span class="text-danger">*</span></label>
                                            <input type="date" class="form-control" name="dateOfBirth" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">年级 <span class="text-danger">*</span></label>
                                            <select class="form-control" name="grade" required>
                                                <option value="">请选择年级</option>
                                                <option value="高一">高一</option>
                                                <option value="高二">高二</option>
                                                <option value="高三">高三</option>
                                                <option value="初一">初一</option>
                                                <option value="初二">初二</option>
                                                <option value="初三">初三</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级 <span class="text-danger">*</span></label>
                                            <select class="form-control" name="class" required>
                                                <option value="">请选择班级</option>
                                                ${classes.map(cls => `
                                                    <option value="${cls._id}">${cls.name} - ${cls.grade}</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">联系电话</label>
                                            <input type="tel" class="form-control" name="phone" placeholder="例: 13800138000">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">邮箱</label>
                                            <input type="email" class="form-control" name="email" placeholder="例: student@school.edu">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">联系地址</label>
                                    <textarea class="form-control" name="address" rows="2" placeholder="请输入详细地址"></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">入学状态</label>
                                    <select class="form-control" name="enrollmentStatus">
                                        <option value="enrolled">在读</option>
                                        <option value="transferred">转学</option>
                                        <option value="suspended">休学</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitAddStudent()">
                                <i class="fas fa-plus me-1"></i>添加学生
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        
        // 设置默认出生日期为15年前
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() - 15);
        $('#addStudentForm input[name="dateOfBirth"]').value = defaultDate.toISOString().split('T')[0];
        
        new bootstrap.Modal($('#addStudentModal')).show();
        
    } catch (error) {
        showAlert('获取班级信息失败，请重试', 'danger');
    }
}

async function showAddClassModal() {
    try {
        // 暂时跳过教师列表获取，专注于修复基本创建功能
        const teachers = [];
        
        cleanupModal('addClassModal');
        const modalHtml = `
            <div class="modal fade" id="addClassModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">创建班级</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addClassForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级ID <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" name="classId" required placeholder="例: CLASS001">
                                            <small class="text-muted">唯一标识符，建议使用字母数字组合</small>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级名称 <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" name="name" required placeholder="例: 高一(1)班">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">年级 <span class="text-danger">*</span></label>
                                            <select class="form-control" name="grade" required>
                                                <option value="">请选择年级</option>
                                                <option value="高一">高一</option>
                                                <option value="高二">高二</option>
                                                <option value="高三">高三</option>
                                                <option value="初一">初一</option>
                                                <option value="初二">初二</option>
                                                <option value="初三">初三</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">学年 <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" name="academicYear" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级容量 <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control" name="capacity" required min="1" max="80" value="40">
                                            <small class="text-muted">建议容量20-50人</small>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级类型</label>
                                            <select class="form-control" name="classType">
                                                <option value="administrative">行政班</option>
                                                <option value="teaching">教学班</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">班主任</label>
                                    <select class="form-control" name="headTeacher">
                                        <option value="">请选择班主任</option>
                                        ${teachers.map(teacher => `
                                            <option value="${teacher._id}">${teacher.name} - ${teacher.staffId}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">教室信息</label>
                                    <div class="row">
                                        <div class="col-md-4">
                                            <input type="text" class="form-control" name="building" placeholder="教学楼">
                                        </div>
                                        <div class="col-md-4">
                                            <input type="text" class="form-control" name="room" placeholder="教室号">
                                        </div>
                                        <div class="col-md-4">
                                            <input type="number" class="form-control" name="floor" placeholder="楼层" min="1" max="20">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="isActive" id="classActive" checked>
                                    <label class="form-check-label" for="classActive">
                                        激活班级（立即可用）
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitAddClass()">
                                <i class="fas fa-plus me-1"></i>创建班级
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        
        // 设置默认学年为当前学年
        const currentYear = new Date().getFullYear();
        $('#addClassForm input[name="academicYear"]').value = `${currentYear}-${currentYear + 1}`;
        
        new bootstrap.Modal($('#addClassModal')).show();
        
    } catch (error) {
        showAlert('获取教师信息失败，请重试', 'danger');
    }
}

function showAddCourseModal() {
    cleanupModal('addCourseModal');
    const modalHtml = `
        <div class="modal fade" id="addCourseModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">创建课程</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addCourseForm">
                            <div class="mb-3">
                                <label class="form-label">课程名称</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">科目</label>
                                <input type="text" class="form-control" name="subject" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">年级</label>
                                <input type="text" class="form-control" name="grade" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">学期</label>
                                <select class="form-control" name="semester" required>
                                    <option value="1">第一学期</option>
                                    <option value="2">第二学期</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">学年</label>
                                <input type="text" class="form-control" name="academicYear" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">描述</label>
                                <textarea class="form-control" name="description" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" onclick="submitAddCourse()">创建</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal($('#addCourseModal')).show();
}

async function showAddAssignmentModal() {
    try {
        // 获取课程列表和班级列表
        const [coursesResponse, classesResponse] = await Promise.all([
            api.get('/courses'),
            api.get('/classes')
        ]);
        
        const courses = coursesResponse.data;
        const classes = classesResponse.data;
        
        cleanupModal('addAssignmentModal');
        const modalHtml = `
            <div class="modal fade" id="addAssignmentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">创建作业</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addAssignmentForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">作业标题</label>
                                            <input type="text" class="form-control" name="title" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">关联课程</label>
                                            <select class="form-control" name="course" required>
                                                <option value="">请选择课程</option>
                                                ${courses.map(course => `
                                                    <option value="${course._id}">${course.name} - ${course.subject}</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">作业类型</label>
                                            <select class="form-control" name="type" required>
                                                <option value="homework">作业</option>
                                                <option value="exam">考试</option>
                                                <option value="project">项目</option>
                                                <option value="quiz">测验</option>
                                                <option value="lab">实验</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">总分</label>
                                            <input type="number" class="form-control" name="totalPoints" value="100" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">开始时间</label>
                                            <input type="datetime-local" class="form-control" name="startDate" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">截止日期</label>
                                            <input type="datetime-local" class="form-control" name="dueDate" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">分配给班级</label>
                                            <select class="form-control" name="assignedClass">
                                                <option value="">选择班级（可选）</option>
                                                ${classes.map(cls => `
                                                    <option value="${cls._id}">${cls.name} - ${cls.grade}</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">具体要求</label>
                                            <input type="text" class="form-control" name="instructions" placeholder="简要说明...">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">作业描述</label>
                                    <textarea class="form-control" name="description" rows="4" placeholder="详细描述作业内容和要求..."></textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">允许重复提交次数</label>
                                            <input type="number" class="form-control" name="attempts" value="1" min="1" max="10">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <div class="form-check mt-4">
                                                <input class="form-check-input" type="checkbox" name="allowLateSubmission" id="allowLateSubmission">
                                                <label class="form-check-label" for="allowLateSubmission">
                                                    允许迟交
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-outline-primary" onclick="submitAddAssignment(false)">保存为草稿</button>
                            <button type="button" class="btn btn-primary" onclick="submitAddAssignment(true)">创建并发布</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        
        // 设置默认开始时间为现在
        const now = new Date();
        const nowString = now.toISOString().slice(0, 16);
        $('#addAssignmentForm input[name="startDate"]').value = nowString;
        
        // 设置默认截止时间为一周后
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(23, 59);
        const weekString = nextWeek.toISOString().slice(0, 16);
        $('#addAssignmentForm input[name="dueDate"]').value = weekString;
        
        new bootstrap.Modal($('#addAssignmentModal')).show();
        
    } catch (error) {
        showAlert('获取课程和班级信息失败', 'danger');
    }
}

function showUploadResourceModal() {
    cleanupModal('uploadResourceModal');
    const modalHtml = `
        <div class="modal fade" id="uploadResourceModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">上传资源</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="uploadResourceForm">
                            <div class="row">
                                <div class="col-md-8">
                                    <div class="mb-3">
                                        <label class="form-label">资源标题</label>
                                        <input type="text" class="form-control" name="title" required>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label">年级</label>
                                        <select class="form-control" name="grade">
                                            <option value="">不限年级</option>
                                            <option value="高一">高一</option>
                                            <option value="高二">高二</option>
                                            <option value="高三">高三</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">科目</label>
                                        <select class="form-control" name="subject" required>
                                            <option value="">请选择科目</option>
                                            <option value="语文">语文</option>
                                            <option value="数学">数学</option>
                                            <option value="英语">英语</option>
                                            <option value="物理">物理</option>
                                            <option value="化学">化学</option>
                                            <option value="生物">生物</option>
                                            <option value="历史">历史</option>
                                            <option value="地理">地理</option>
                                            <option value="政治">政治</option>
                                            <option value="其他">其他</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">资源类型</label>
                                        <select class="form-control" name="type" required onchange="updateFileAccept(this.value)">
                                            <option value="">请选择类型</option>
                                            <option value="document">文档</option>
                                            <option value="presentation">演示文稿</option>
                                            <option value="spreadsheet">电子表格</option>
                                            <option value="image">图片</option>
                                            <option value="video">视频</option>
                                            <option value="audio">音频</option>
                                            <option value="other">其他</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">文件上传</label>
                                <input type="file" class="form-control" name="file" id="resourceFile" required onchange="previewFile(this)">
                                <div class="form-text">支持的文件格式: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG, MP4, MP3等</div>
                                <div class="form-text">最大文件大小: 10MB</div>
                            </div>
                            
                            <div id="filePreview" class="mb-3" style="display: none;">
                                <div class="border rounded p-3 bg-light">
                                    <div class="d-flex align-items-center">
                                        <i id="fileIcon" class="fas fa-file fa-2x text-primary me-3"></i>
                                        <div>
                                            <div id="fileName" class="fw-bold"></div>
                                            <div id="fileSize" class="text-muted"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">访问权限</label>
                                        <select class="form-control" name="accessLevel" required>
                                            <option value="public">公开 (所有人可见)</option>
                                            <option value="school">校内 (仅本校师生)</option>
                                            <option value="class">班级 (指定班级)</option>
                                            <option value="private">私有 (仅自己)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <div class="form-check mt-4">
                                            <input class="form-check-input" type="checkbox" name="featured" id="featuredResource">
                                            <label class="form-check-label" for="featuredResource">
                                                设为精选资源
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">资源描述</label>
                                <textarea class="form-control" name="description" rows="3" placeholder="请简要描述该资源的内容和用途..."></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">标签 (可选)</label>
                                <input type="text" class="form-control" name="tags" placeholder="用逗号分隔标签，如：练习题,期中考试,重点知识">
                            </div>
                            
                            <div id="uploadProgress" class="mb-3" style="display: none;">
                                <div class="progress">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
                                </div>
                                <small class="text-muted">正在上传...</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" onclick="submitUploadResource()" id="uploadButton">
                            <i class="fas fa-upload me-1"></i>上传资源
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal($('#uploadResourceModal')).show();
}

async function showCreateDiscussionModal() {
    try {
        // 获取课程和班级列表
        const [coursesResponse, classesResponse] = await Promise.all([
            api.get('/courses'),
            api.get('/classes')
        ]);
        
        const courses = coursesResponse.data;
        const classes = classesResponse.data;
        
        cleanupModal('createDiscussionModal');
        const modalHtml = `
            <div class="modal fade" id="createDiscussionModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">创建讨论</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createDiscussionForm">
                                <div class="mb-3">
                                    <label class="form-label">讨论标题</label>
                                    <input type="text" class="form-control" name="title" required placeholder="请输入讨论标题...">
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">讨论类型</label>
                                            <select class="form-control" name="type" required>
                                                <option value="general">一般讨论</option>
                                                <option value="qa">问答</option>
                                                <option value="announcement">公告</option>
                                                <option value="homework">作业讨论</option>
                                                <option value="study">学习交流</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">相关课程（可选）</label>
                                            <select class="form-control" name="course">
                                                <option value="">不限定课程</option>
                                                ${courses.map(course => `
                                                    <option value="${course._id}">${course.name} - ${course.subject}</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">相关班级（可选）</label>
                                    <select class="form-control" name="class">
                                        <option value="">所有班级可见</option>
                                        ${classes.map(cls => `
                                            <option value="${cls._id}">${cls.name} - ${cls.grade}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">讨论内容</label>
                                    <textarea class="form-control" name="content" rows="6" required placeholder="请详细描述讨论内容..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitCreateDiscussion()">创建讨论</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#createDiscussionModal')).show();
        
    } catch (error) {
        showAlert('获取课程和班级信息失败', 'danger');
    }
}

// CRUD操作处理函数
async function submitAddStudent() {
    try {
        const form = $('#addStudentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 前端验证
        if (!data.studentId) {
            showAlert('请填写学号', 'warning');
            return;
        }
        if (!data.name) {
            showAlert('请填写学生姓名', 'warning');
            return;
        }
        if (!data.gender) {
            showAlert('请选择性别', 'warning');
            return;
        }
        if (!data.dateOfBirth) {
            showAlert('请选择出生日期', 'warning');
            return;
        }
        if (!data.grade) {
            showAlert('请选择年级', 'warning');
            return;
        }
        if (!data.class) {
            showAlert('请选择班级', 'warning');
            return;
        }
        
        // 验证学号格式
        if (!/^\d{8}$/.test(data.studentId)) {
            showAlert('学号格式不正确，应为8位数字', 'warning');
            return;
        }
        
        // 验证出生日期是否合理
        const birthDate = new Date(data.dateOfBirth);
        const now = new Date();
        const age = now.getFullYear() - birthDate.getFullYear();
        if (age < 5 || age > 25) {
            showAlert('出生日期不合理，学生年龄应在5-25岁之间', 'warning');
            return;
        }
        
        // 验证邮箱格式
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            showAlert('邮箱格式不正确', 'warning');
            return;
        }
        
        // 验证手机号格式
        if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
            showAlert('手机号格式不正确', 'warning');
            return;
        }
        
        // 构造数据结构以匹配模型
        const studentData = {
            studentId: data.studentId,
            name: data.name.trim(),
            gender: data.gender,
            dateOfBirth: data.dateOfBirth,
            grade: data.grade,
            class: data.class,
            enrollmentStatus: data.enrollmentStatus || 'enrolled'
        };
        
        // 处理联系信息
        if (data.phone || data.email || data.address) {
            studentData.contactInfo = {
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || ''
            };
        }
        
        // 提交学生数据
        
        const response = await api.post('/students', studentData);
        
        bootstrap.Modal.getInstance($('#addStudentModal')).hide();
        showAlert('学生添加成功', 'success');
        showStudentManagement();
        
    } catch (error) {
        console.error('添加学生错误:', error);
        showAlert(`添加学生失败: ${error.message || '未知错误'}`, 'danger');
    }
}

async function submitAddClass() {
    try {
        const form = $('#addClassForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 前端验证
        if (!data.classId) {
            showAlert('请填写班级ID', 'warning');
            return;
        }
        if (!data.name) {
            showAlert('请填写班级名称', 'warning');
            return;
        }
        if (!data.grade) {
            showAlert('请选择年级', 'warning');
            return;
        }
        if (!data.academicYear) {
            showAlert('请填写学年', 'warning');
            return;
        }
        if (!data.capacity || data.capacity < 1) {
            showAlert('请填写有效的班级容量', 'warning');
            return;
        }
        
        // 验证班级ID格式
        if (!/^[A-Z0-9_-]+$/i.test(data.classId)) {
            showAlert('班级ID只能包含字母、数字、下划线和连字符', 'warning');
            return;
        }
        
        // 验证容量范围
        if (data.capacity > 80) {
            showAlert('班级容量不能超过80人', 'warning');
            return;
        }
        
        // 构造数据结构以匹配模型
        const classData = {
            classId: data.classId.toUpperCase(),
            name: data.name.trim(),
            grade: data.grade,
            academicYear: data.academicYear,
            capacity: parseInt(data.capacity, 10),
            classType: data.classType || 'administrative',
            isActive: data.isActive === 'on' || true
        };
        
        // 处理班主任
        if (data.headTeacher) {
            classData.headTeacher = data.headTeacher;
        }
        
        // 处理教室信息
        if (data.building || data.room || data.floor) {
            classData.classroom = {
                building: data.building || '',
                room: data.room || '',
                floor: parseInt(data.floor, 10) || 1
            };
        }
        
        // 提交班级数据
        
        const response = await api.post('/classes', classData);
        
        bootstrap.Modal.getInstance($('#addClassModal')).hide();
        showAlert('班级创建成功', 'success');
        showClassManagement();
        
    } catch (error) {
        console.error('创建班级错误:', error);
        showAlert(`创建班级失败: ${error.message || '未知错误'}`, 'danger');
    }
}

async function submitAddCourse() {
    try {
        const form = $('#addCourseForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 前端验证
        if (!data.name) {
            showAlert('请填写课程名称', 'warning');
            return;
        }
        if (!data.subject) {
            showAlert('请填写课程科目', 'warning');
            return;
        }
        if (!data.credits || data.credits < 0) {
            showAlert('请填写有效的学分', 'warning');
            return;
        }
        
        // 提交课程数据
        
        const response = await api.post('/courses', data);
        
        bootstrap.Modal.getInstance($('#addCourseModal')).hide();
        showAlert('课程创建成功', 'success');
        showCourseManagement();
    } catch (error) {
        console.error('创建课程错误:', error);
        showAlert(`创建课程失败: ${error.message || '未知错误'}`, 'danger');
    }
}

async function submitAddAssignment(isPublished = false) {
    try {
        const form = $('#addAssignmentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 设置发布状态
        data.isPublished = isPublished;
        
        // 处理班级分配
        if (data.assignedClass) {
            data.assignedTo = [{
                class: data.assignedClass,
                students: [] // 稍后可以通过班级获取学生列表
            }];
            delete data.assignedClass;
        } else {
            data.assignedTo = [];
        }
        
        // 处理允许迟交设置
        data.lateSubmission = {
            allowed: data.allowLateSubmission === 'on',
            penalty: 10 // 默认每天扣10分
        };
        delete data.allowLateSubmission;
        
        // 确保必填字段有值
        if (!data.title) {
            showAlert('请填写作业标题', 'warning');
            return;
        }
        if (!data.course) {
            showAlert('请选择关联课程', 'warning');
            return;
        }
        if (!data.startDate) {
            showAlert('请设置开始时间', 'warning');
            return;
        }
        if (!data.dueDate) {
            showAlert('请设置截止日期', 'warning');
            return;
        }
        
        // 验证日期有效性
        const startDate = new Date(data.startDate);
        const dueDate = new Date(data.dueDate);
        
        if (dueDate <= startDate) {
            showAlert('截止日期必须晚于开始时间', 'warning');
            return;
        }
        
        // 提交作业数据
        
        const response = await api.post('/assignments', data);
        
        bootstrap.Modal.getInstance($('#addAssignmentModal')).hide();
        
        if (isPublished) {
            showAlert('作业创建并发布成功', 'success');
        } else {
            showAlert('作业保存为草稿成功', 'success');
        }
        
        showAssignmentManagement();
    } catch (error) {
        console.error('创建作业错误:', error);
        showAlert(`创建作业失败: ${error.message || '未知错误'}`, 'danger');
    }
}

async function submitUploadResource() {
    try {
        const form = $('#uploadResourceForm');
        const formData = new FormData(form);
        
        // 显示上传进度
        const progressBar = $('#uploadProgress');
        if (progressBar) {
            progressBar.style.display = 'block';
        }
        
        const response = await fetch('/api/learning/resources', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '上传失败');
        }
        
        const result = await response.json();
        
        bootstrap.Modal.getInstance($('#uploadResourceModal')).hide();
        showAlert('资源上传成功', 'success');
        showResources();
    } catch (error) {
        console.error('上传资源错误:', error);
        showAlert(`上传资源失败: ${error.message || '未知错误'}`, 'danger');
    } finally {
        const progressBar = $('#uploadProgress');
        if (progressBar) {
            progressBar.style.display = 'none';
        }
    }
}

async function submitCreateDiscussion() {
    try {
        const form = $('#createDiscussionForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 验证必填字段
        if (!data.title) {
            showAlert('请填写讨论标题', 'warning');
            return;
        }
        if (!data.content) {
            showAlert('请填写讨论内容', 'warning');
            return;
        }
        
        // 清理空字段
        if (!data.course) {delete data.course;}
        if (!data.class) {delete data.class;}
        
        // 提交讨论数据
        
        const response = await api.post('/learning/discussions', data);
        
        bootstrap.Modal.getInstance($('#createDiscussionModal')).hide();
        showAlert('讨论创建成功', 'success');
        showDiscussions();
    } catch (error) {
        console.error('创建讨论错误:', error);
        showAlert(`创建讨论失败: ${error.message || '未知错误'}`, 'danger');
    }
}

async function submitEditStudent(studentId) {
    try {
        const form = $('#editStudentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 处理联系信息
        if (data.phone || data.email) {
            data.contactInfo = {
                phone: data.phone,
                email: data.email
            };
            delete data.phone;
            delete data.email;
        }
        
        // 处理家庭成员信息
        const familyMembers = [];
        const familyKeys = Object.keys(data).filter(key => key.startsWith('familyMembers'));
        
        if (familyKeys.length > 0) {
            const memberIndices = new Set();
            familyKeys.forEach(key => {
                const match = key.match(/familyMembers\[(\d+)\]/);
                if (match) {
                    memberIndices.add(parseInt(match[1], 10));
                }
            });
            
            memberIndices.forEach(index => {
                const member = {
                    name: data[`familyMembers[${index}][name]`],
                    relationship: data[`familyMembers[${index}][relationship]`],
                    phone: data[`familyMembers[${index}][phone]`],
                    occupation: data[`familyMembers[${index}][occupation]`]
                };
                
                if (member.name) {
                    familyMembers.push(member);
                }
                
                delete data[`familyMembers[${index}][name]`];
                delete data[`familyMembers[${index}][relationship]`];
                delete data[`familyMembers[${index}][phone]`];
                delete data[`familyMembers[${index}][occupation]`];
            });
        }
        
        if (familyMembers.length > 0) {
            data.familyMembers = familyMembers;
        }
        
        await api.put(`/students/${studentId}`, data);
        
        bootstrap.Modal.getInstance($('#editStudentModal')).hide();
        showAlert('学生信息更新成功', 'success');
        showStudentManagement();
    } catch (error) {
        showAlert('更新学生信息失败', 'danger');
    }
}

// 查看操作
async function viewStudent(studentId) {
    try {
        const response = await api.get(`/students/${studentId}`);
        const student = response.data;
        
        cleanupModal('viewStudentModal');
        const modalHtml = `
            <div class="modal fade" id="viewStudentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">学生详情</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>学号:</strong> ${student.studentId}</p>
                                    <p><strong>姓名:</strong> ${student.name}</p>
                                    <p><strong>性别:</strong> ${student.gender === 'male' ? '男' : '女'}</p>
                                    <p><strong>年级:</strong> ${student.grade}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>班级:</strong> ${student.class?.name || '未分班'}</p>
                                    <p><strong>状态:</strong> ${getStatusText(student.enrollmentStatus)}</p>
                                    <p><strong>联系电话:</strong> ${student.phone || '无'}</p>
                                    <p><strong>邮箱:</strong> ${student.email || '无'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#viewStudentModal')).show();
    } catch (error) {
        showAlert('加载学生详情失败', 'danger');
    }
}

async function editStudent(studentId) {
    try {
        const response = await api.get(`/students/${studentId}`);
        const student = response.data;
        
        // 获取所有班级用于下拉选择
        const classesResponse = await api.get('/classes');
        const classes = classesResponse.data;
        
        cleanupModal('editStudentModal');
        const modalHtml = `
            <div class="modal fade" id="editStudentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">编辑学生信息</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editStudentForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">学号</label>
                                            <input type="text" class="form-control" name="studentId" value="${student.studentId}" readonly>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">姓名</label>
                                            <input type="text" class="form-control" name="name" value="${student.name}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">性别</label>
                                            <select class="form-control" name="gender" required>
                                                <option value="male" ${student.gender === 'male' ? 'selected' : ''}>男</option>
                                                <option value="female" ${student.gender === 'female' ? 'selected' : ''}>女</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">出生日期</label>
                                            <input type="date" class="form-control" name="dateOfBirth" 
                                                   value="${student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : ''}">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">年级</label>
                                            <input type="text" class="form-control" name="grade" value="${student.grade}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级</label>
                                            <select class="form-control" name="class">
                                                <option value="">请选择班级</option>
                                                ${classes.map(cls => `
                                                    <option value="${cls._id}" ${student.class?._id === cls._id ? 'selected' : ''}>
                                                        ${cls.name}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">联系电话</label>
                                            <input type="tel" class="form-control" name="phone" 
                                                   value="${student.contactInfo?.phone || ''}">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">邮箱</label>
                                            <input type="email" class="form-control" name="email" 
                                                   value="${student.contactInfo?.email || ''}">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">入学状态</label>
                                    <select class="form-control" name="enrollmentStatus">
                                        <option value="enrolled" ${student.enrollmentStatus === 'enrolled' ? 'selected' : ''}>在读</option>
                                        <option value="pending" ${student.enrollmentStatus === 'pending' ? 'selected' : ''}>待确认</option>
                                        <option value="graduated" ${student.enrollmentStatus === 'graduated' ? 'selected' : ''}>已毕业</option>
                                        <option value="transferred" ${student.enrollmentStatus === 'transferred' ? 'selected' : ''}>转学</option>
                                        <option value="dropped" ${student.enrollmentStatus === 'dropped' ? 'selected' : ''}>退学</option>
                                    </select>
                                </div>
                                
                                <h6 class="mt-4 mb-3">家庭联系人信息</h6>
                                <div id="familyMembersContainer">
                                    ${student.familyMembers?.map((member, index) => `
                                        <div class="family-member border rounded p-3 mb-3">
                                            <div class="row">
                                                <div class="col-md-3">
                                                    <label class="form-label">姓名</label>
                                                    <input type="text" class="form-control" name="familyMembers[${index}][name]" value="${member.name}">
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">关系</label>
                                                    <select class="form-control" name="familyMembers[${index}][relationship]">
                                                        <option value="父亲" ${member.relationship === '父亲' ? 'selected' : ''}>父亲</option>
                                                        <option value="母亲" ${member.relationship === '母亲' ? 'selected' : ''}>母亲</option>
                                                        <option value="监护人" ${member.relationship === '监护人' ? 'selected' : ''}>监护人</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">电话</label>
                                                    <input type="tel" class="form-control" name="familyMembers[${index}][phone]" value="${member.phone}">
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">职业</label>
                                                    <input type="text" class="form-control" name="familyMembers[${index}][occupation]" value="${member.occupation || ''}">
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') || ''}
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitEditStudent('${studentId}')">保存更改</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#editStudentModal')).show();
    } catch (error) {
        showAlert('加载学生信息失败', 'danger');
    }
}

async function deleteStudent(studentId) {
    if (confirm('确定要删除这个学生吗？')) {
        try {
            await api.delete(`/students/${studentId}`);
            showAlert('学生删除成功', 'success');
            showStudentManagement();
        } catch (error) {
            showAlert('删除学生失败', 'danger');
        }
    }
}

async function viewClass(classId) {
    try {
        const response = await api.get(`/classes/${classId}`);
        const classData = response.data;
        
        // 获取班级学生列表
        const studentsResponse = await api.get(`/students?class=${classId}&limit=100`);
        const students = studentsResponse.data;
        
        cleanupModal('viewClassModal');
        const modalHtml = `
            <div class="modal fade" id="viewClassModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">班级详情 - ${classData.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card mb-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">基本信息</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>班级编号:</strong> ${classData.classId || '无'}</p>
                                            <p><strong>年级:</strong> ${classData.grade}</p>
                                            <p><strong>学年:</strong> ${classData.academicYear}</p>
                                            <p><strong>班级类型:</strong> ${classData.classType === 'administrative' ? '行政班' : '教学班'}</p>
                                            <p><strong>班主任:</strong> ${classData.headTeacher?.name || '未分配'}</p>
                                            <p><strong>教室:</strong> ${classData.classroom ? `${classData.classroom.building}${classData.classroom.room}` : '未分配'}</p>
                                            <p><strong>状态:</strong> 
                                                <span class="badge bg-${classData.isActive ? 'success' : 'secondary'}">
                                                    ${classData.isActive ? '活跃' : '停用'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0">统计信息</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row text-center">
                                                <div class="col-6">
                                                    <h4 class="text-primary">${classData.currentEnrollment}</h4>
                                                    <small>当前人数</small>
                                                </div>
                                                <div class="col-6">
                                                    <h4 class="text-success">${classData.capacity}</h4>
                                                    <small>容量</small>
                                                </div>
                                            </div>
                                            <div class="progress mt-2">
                                                <div class="progress-bar" role="progressbar" 
                                                     style="width: ${(classData.currentEnrollment / classData.capacity) * 100}%">
                                                </div>
                                            </div>
                                            <small class="text-muted">容量利用率: ${Math.round((classData.currentEnrollment / classData.capacity) * 100)}%</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-8">
                                    <div class="card">
                                        <div class="card-header d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">学生名单 (${students.length}人)</h6>
                                            <button class="btn btn-sm btn-primary" onclick="exportClassList('${classId}')">
                                                <i class="fas fa-download"></i> 导出名单
                                            </button>
                                        </div>
                                        <div class="card-body">
                                            <div class="table-responsive" style="max-height: 400px;">
                                                <table class="table table-sm table-hover">
                                                    <thead class="table-light">
                                                        <tr>
                                                            <th>学号</th>
                                                            <th>姓名</th>
                                                            <th>性别</th>
                                                            <th>联系电话</th>
                                                            <th>状态</th>
                                                            <th>操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${students.map(student => `
                                                            <tr>
                                                                <td>${student.studentId}</td>
                                                                <td>${student.name}</td>
                                                                <td>${student.gender === 'male' ? '男' : '女'}</td>
                                                                <td>${student.contactInfo?.phone || '无'}</td>
                                                                <td>
                                                                    <span class="badge bg-${getStatusColor(student.enrollmentStatus)}">
                                                                        ${getStatusText(student.enrollmentStatus)}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button class="btn btn-xs btn-outline-primary" onclick="viewStudent('${student._id}')">
                                                                        <i class="fas fa-eye"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <button type="button" class="btn btn-primary" onclick="bootstrap.Modal.getInstance($('#viewClassModal')).hide(); editClass('${classId}')">编辑班级</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#viewClassModal')).show();
    } catch (error) {
        showAlert('加载班级信息失败', 'danger');
    }
}

async function editClass(classId) {
    try {
        const response = await api.get(`/classes/${classId}`);
        const classData = response.data;
        
        // 获取所有教师用于班主任选择
        const staffResponse = await api.get('/auth/staff');
        const staff = staffResponse.data || [];
        
        cleanupModal('editClassModal');
        const modalHtml = `
            <div class="modal fade" id="editClassModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">编辑班级信息</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editClassForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级编号</label>
                                            <input type="text" class="form-control" name="classId" value="${classData.classId || ''}" readonly>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级名称</label>
                                            <input type="text" class="form-control" name="name" value="${classData.name}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">年级</label>
                                            <input type="text" class="form-control" name="grade" value="${classData.grade}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">学年</label>
                                            <input type="text" class="form-control" name="academicYear" value="${classData.academicYear}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班级类型</label>
                                            <select class="form-control" name="classType" required>
                                                <option value="administrative" ${classData.classType === 'administrative' ? 'selected' : ''}>行政班</option>
                                                <option value="teaching" ${classData.classType === 'teaching' ? 'selected' : ''}>教学班</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">容量</label>
                                            <input type="number" class="form-control" name="capacity" value="${classData.capacity}" min="1" max="60" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">班主任</label>
                                            <select class="form-control" name="headTeacher">
                                                <option value="">请选择班主任</option>
                                                ${staff.map(teacher => `
                                                    <option value="${teacher._id}" ${classData.headTeacher?._id === teacher._id ? 'selected' : ''}>
                                                        ${teacher.name} (${teacher.staffId})
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">状态</label>
                                            <select class="form-control" name="isActive">
                                                <option value="true" ${classData.isActive ? 'selected' : ''}>活跃</option>
                                                <option value="false" ${!classData.isActive ? 'selected' : ''}>停用</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <h6 class="mt-4 mb-3">教室信息</h6>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">教学楼</label>
                                            <input type="text" class="form-control" name="building" value="${classData.classroom?.building || ''}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">房间号</label>
                                            <input type="text" class="form-control" name="room" value="${classData.classroom?.room || ''}">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">楼层</label>
                                            <input type="number" class="form-control" name="floor" value="${classData.classroom?.floor || ''}" min="1" max="10">
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitEditClass('${classId}')">保存更改</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#editClassModal')).show();
    } catch (error) {
        showAlert('加载班级信息失败', 'danger');
    }
}

async function manageSchedule(classId) {
    try {
        const response = await api.get(`/classes/${classId}`);
        const classData = response.data;
        
        // 获取课程列表
        const coursesResponse = await api.get('/courses');
        const courses = coursesResponse.data;
        
        cleanupModal('scheduleModal');
        const modalHtml = `
            <div class="modal fade" id="scheduleModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">课表管理 - ${classData.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-8">
                                    <h6>当前课表</h6>
                                </div>
                                <div class="col-md-4 text-end">
                                    <button class="btn btn-primary btn-sm" onclick="addScheduleSlot('${classId}')">
                                        <i class="fas fa-plus"></i> 添加课时
                                    </button>
                                </div>
                            </div>
                            
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead class="table-light">
                                        <tr>
                                            <th style="width: 100px;">时间</th>
                                            <th>周一</th>
                                            <th>周二</th>
                                            <th>周三</th>
                                            <th>周四</th>
                                            <th>周五</th>
                                        </tr>
                                    </thead>
                                    <tbody id="scheduleTable">
                                        ${generateScheduleTable(classData.schedule || [])}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="mt-4">
                                <h6>添加新课时</h6>
                                <form id="addScheduleForm">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <select class="form-control" name="dayOfWeek" required>
                                                <option value="">选择星期</option>
                                                <option value="1">周一</option>
                                                <option value="2">周二</option>
                                                <option value="3">周三</option>
                                                <option value="4">周四</option>
                                                <option value="5">周五</option>
                                            </select>
                                        </div>
                                        <div class="col-md-2">
                                            <input type="time" class="form-control" name="startTime" required>
                                        </div>
                                        <div class="col-md-2">
                                            <input type="time" class="form-control" name="endTime" required>
                                        </div>
                                        <div class="col-md-3">
                                            <select class="form-control" name="course" required>
                                                <option value="">选择课程</option>
                                                ${courses.map(course => `
                                                    <option value="${course._id}">${course.name}</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-2">
                                            <button type="button" class="btn btn-success w-100" onclick="submitScheduleSlot('${classId}')">
                                                添加
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <button type="button" class="btn btn-primary" onclick="exportSchedule('${classId}')">导出课表</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#scheduleModal')).show();
    } catch (error) {
        showAlert('加载课表信息失败', 'danger');
    }
}

// 生成课表表格
function generateScheduleTable(schedule) {
    const timeSlots = [
        '08:00-08:45', '08:55-09:40', '10:00-10:45', '10:55-11:40',
        '14:00-14:45', '14:55-15:40', '16:00-16:45', '16:55-17:40'
    ];
    
    const scheduleMap = {};
    schedule.forEach(slot => {
        const key = `${slot.dayOfWeek}-${slot.period}`;
        scheduleMap[key] = slot;
    });
    
    return timeSlots.map((time, period) => `
        <tr>
            <td class="fw-bold">${time}</td>
            ${[1,2,3,4,5].map(day => {
                const slot = scheduleMap[`${day}-${period + 1}`];
                return `
                    <td class="schedule-cell">
                        ${slot ? `
                            <div class="schedule-item bg-light p-2 rounded">
                                <div class="fw-bold">${slot.course?.name || '未知课程'}</div>
                                <small class="text-muted">${slot.teacher?.name || '未分配'}</small>
                                <button class="btn btn-xs btn-outline-danger float-end" onclick="removeScheduleSlot('${slot._id}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        ` : ''}
                    </td>
                `;
            }).join('')}
        </tr>
    `).join('');
}

// 添加课时
async function submitScheduleSlot(classId) {
    try {
        const form = $('#addScheduleForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 确定课时节次
        const startHour = parseInt(data.startTime.split(':')[0], 10);
        let period;
        if (startHour >= 8 && startHour < 12) {
            period = Math.floor((startHour - 8) * 2) + 1;
        } else {
            period = Math.floor((startHour - 14) * 2) + 5;
        }
        
        const scheduleData = {
            dayOfWeek: parseInt(data.dayOfWeek, 10),
            period: period,
            startTime: data.startTime,
            endTime: data.endTime,
            course: data.course
        };
        
        await api.post(`/classes/${classId}/schedule`, scheduleData);
        
        showAlert('课时添加成功', 'success');
        // 重新加载课表
        manageSchedule(classId);
    } catch (error) {
        showAlert('添加课时失败', 'danger');
    }
}

// 导出课表
async function exportSchedule(classId) {
    try {
        const response = await api.get(`/classes/${classId}`);
        const classData = response.data;
        
        let csvContent = "课表导出,,,,,\n";
        csvContent += `班级:,${classData.name},,年级:,${classData.grade},\n`;
        csvContent += "时间,周一,周二,周三,周四,周五\n";
        
        const timeSlots = [
            '08:00-08:45', '08:55-09:40', '10:00-10:45', '10:55-11:40',
            '14:00-14:45', '14:55-15:40', '16:00-16:45', '16:55-17:40'
        ];
        
        const schedule = classData.schedule || [];
        const scheduleMap = {};
        schedule.forEach(slot => {
            const key = `${slot.dayOfWeek}-${slot.period}`;
            scheduleMap[key] = slot;
        });
        
        timeSlots.forEach((time, period) => {
            let row = time;
            for (let day = 1; day <= 5; day++) {
                const slot = scheduleMap[`${day}-${period + 1}`];
                row += ',' + (slot ? slot.course?.name || '未知课程' : '');
            }
            csvContent += row + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${classData.name}_课表_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showAlert('课表导出成功', 'success');
    } catch (error) {
        showAlert('导出课表失败', 'danger');
    }
}

async function viewCourse(courseId) {
    try {
        const response = await api.get(`/courses/${courseId}`);
        const course = response.data;
        
        // 获取课程作业列表
        const assignmentsResponse = await api.get(`/assignments?course=${courseId}&limit=10`);
        const assignments = assignmentsResponse.data;
        
        cleanupModal('viewCourseModal');
        const modalHtml = `
            <div class="modal fade" id="viewCourseModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">课程详情 - ${course.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card mb-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">基本信息</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>课程编号:</strong> ${course.courseId || '无'}</p>
                                            <p><strong>科目:</strong> ${course.subject}</p>
                                            <p><strong>年级:</strong> ${course.grade}</p>
                                            <p><strong>学期:</strong> 第${course.semester}学期</p>
                                            <p><strong>学年:</strong> ${course.academicYear}</p>
                                            <p><strong>授课教师:</strong> ${course.teacher?.name || '未分配'}</p>
                                            <p><strong>学分:</strong> ${course.credits || '未设置'}</p>
                                            <p><strong>总课时:</strong> ${course.totalHours || '未设置'}</p>
                                        </div>
                                    </div>
                                    
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0">选课信息</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>选课班级:</strong></p>
                                            <ul class="list-unstyled">
                                                ${course.enrolledClasses?.map(cls => `
                                                    <li><span class="badge bg-primary">${cls.name}</span></li>
                                                `).join('') || '<li class="text-muted">暂无班级选课</li>'}
                                            </ul>
                                            <p class="mt-3"><strong>总学生数:</strong> ${course.enrolledStudents?.length || 0} 人</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-8">
                                    <div class="card mb-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">课程描述</h6>
                                        </div>
                                        <div class="card-body">
                                            <p>${course.description || '暂无描述'}</p>
                                        </div>
                                    </div>
                                    
                                    <div class="card">
                                        <div class="card-header d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">课程作业 (${assignments.length}个)</h6>
                                            <button class="btn btn-sm btn-primary" onclick="bootstrap.Modal.getInstance($('#viewCourseModal')).hide(); showAddAssignmentModal()">
                                                <i class="fas fa-plus"></i> 添加作业
                                            </button>
                                        </div>
                                        <div class="card-body">
                                            <div class="table-responsive" style="max-height: 300px;">
                                                <table class="table table-sm table-hover">
                                                    <thead class="table-light">
                                                        <tr>
                                                            <th>作业标题</th>
                                                            <th>类型</th>
                                                            <th>截止时间</th>
                                                            <th>状态</th>
                                                            <th>操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${assignments.map(assignment => `
                                                            <tr>
                                                                <td>${assignment.title}</td>
                                                                <td>
                                                                    <span class="badge bg-secondary">${getAssignmentTypeText(assignment.type)}</span>
                                                                </td>
                                                                <td>${formatDate(assignment.dueDate)}</td>
                                                                <td>
                                                                    <span class="badge bg-${assignment.isPublished ? 'success' : 'warning'}">
                                                                        ${assignment.isPublished ? '已发布' : '草稿'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button class="btn btn-xs btn-outline-primary" onclick="viewAssignment('${assignment._id}')">
                                                                        <i class="fas fa-eye"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <button type="button" class="btn btn-primary" onclick="bootstrap.Modal.getInstance($('#viewCourseModal')).hide(); editCourse('${courseId}')">编辑课程</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#viewCourseModal')).show();
    } catch (error) {
        showAlert('加载课程详情失败', 'danger');
    }
}

async function editCourse(courseId) {
    try {
        const response = await api.get(`/courses/${courseId}`);
        const course = response.data;
        
        // 获取所有教师和班级
        const [staffResponse, classesResponse] = await Promise.all([
            api.get('/auth/staff'),
            api.get('/classes')
        ]);
        const staff = staffResponse.data || [];
        const classes = classesResponse.data || [];
        
        cleanupModal('editCourseModal');
        const modalHtml = `
            <div class="modal fade" id="editCourseModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">编辑课程信息</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editCourseForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">课程编号</label>
                                            <input type="text" class="form-control" name="courseId" value="${course.courseId || ''}" readonly>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">课程名称</label>
                                            <input type="text" class="form-control" name="name" value="${course.name}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">科目</label>
                                            <input type="text" class="form-control" name="subject" value="${course.subject}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">年级</label>
                                            <input type="text" class="form-control" name="grade" value="${course.grade}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">学期</label>
                                            <select class="form-control" name="semester" required>
                                                <option value="1" ${course.semester == 1 ? 'selected' : ''}>第一学期</option>
                                                <option value="2" ${course.semester == 2 ? 'selected' : ''}>第二学期</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">学年</label>
                                            <input type="text" class="form-control" name="academicYear" value="${course.academicYear}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">授课教师</label>
                                            <select class="form-control" name="teacher">
                                                <option value="">请选择教师</option>
                                                ${staff.map(teacher => `
                                                    <option value="${teacher._id}" ${course.teacher?._id === teacher._id ? 'selected' : ''}>
                                                        ${teacher.name} (${teacher.staffId})
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">学分</label>
                                            <input type="number" class="form-control" name="credits" value="${course.credits || ''}" min="1" max="10" step="0.5">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">总课时</label>
                                            <input type="number" class="form-control" name="totalHours" value="${course.totalHours || ''}" min="1">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">课程状态</label>
                                            <select class="form-control" name="isActive">
                                                <option value="true" ${course.isActive !== false ? 'selected' : ''}>进行中</option>
                                                <option value="false" ${course.isActive === false ? 'selected' : ''}>已结束</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">课程描述</label>
                                    <textarea class="form-control" name="description" rows="3">${course.description || ''}</textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">选课班级</label>
                                    <div class="border rounded p-3" style="max-height: 150px; overflow-y: auto;">
                                        ${classes.map(cls => `
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" name="enrolledClasses" value="${cls._id}" 
                                                       ${course.enrolledClasses?.some(enrolled => enrolled._id === cls._id) ? 'checked' : ''}>
                                                <label class="form-check-label">${cls.name} (${cls.grade})</label>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitEditCourse('${courseId}')">保存更改</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#editCourseModal')).show();
    } catch (error) {
        showAlert('加载课程信息失败', 'danger');
    }
}

async function viewAssignment(assignmentId) {
    try {
        const response = await api.get(`/assignments/${assignmentId}`);
        const assignment = response.data;
        
        // 获取作业提交情况
        const submissionsResponse = await api.get(`/assignments/${assignmentId}/submissions`);
        const submissions = submissionsResponse.data || [];
        
        cleanupModal('viewAssignmentModal');
        const modalHtml = `
            <div class="modal fade" id="viewAssignmentModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">作业详情 - ${assignment.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card mb-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">基本信息</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>作业类型:</strong> ${getAssignmentTypeText(assignment.type)}</p>
                                            <p><strong>课程:</strong> ${assignment.course?.name || '未知课程'}</p>
                                            <p><strong>创建时间:</strong> ${formatDate(assignment.startDate)}</p>
                                            <p><strong>截止时间:</strong> ${formatDate(assignment.dueDate)}</p>
                                            <p><strong>总分:</strong> ${assignment.totalPoints} 分</p>
                                            <p><strong>允许次数:</strong> ${assignment.attempts} 次</p>
                                            <p><strong>状态:</strong> 
                                                <span class="badge bg-${assignment.isPublished ? 'success' : 'warning'}">
                                                    ${assignment.isPublished ? '已发布' : '草稿'}
                                                </span>
                                            </p>
                                            <p><strong>延迟提交:</strong> 
                                                <span class="badge bg-${assignment.lateSubmission?.allowed ? 'success' : 'danger'}">
                                                    ${assignment.lateSubmission?.allowed ? '允许' : '不允许'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0">提交统计</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row text-center">
                                                <div class="col-6">
                                                    <h4 class="text-primary">${submissions.length}</h4>
                                                    <small>已提交</small>
                                                </div>
                                                <div class="col-6">
                                                    <h4 class="text-warning">${submissions.filter(s => s.status === 'graded').length}</h4>
                                                    <small>已批改</small>
                                                </div>
                                            </div>
                                            <div class="mt-3">
                                                <div class="progress">
                                                    <div class="progress-bar" role="progressbar" 
                                                         style="width: ${(submissions.length / (assignment.assignedTo?.[0]?.students?.length || 1)) * 100}%">
                                                    </div>
                                                </div>
                                                <small class="text-muted">提交率</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-8">
                                    <div class="card mb-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">作业描述</h6>
                                        </div>
                                        <div class="card-body">
                                            <p>${assignment.description || '暂无描述'}</p>
                                            ${assignment.requirements ? `
                                                <hr>
                                                <h6>作业要求:</h6>
                                                <p>${assignment.requirements}</p>
                                            ` : ''}
                                            ${assignment.attachments?.length > 0 ? `
                                                <hr>
                                                <h6>附件:</h6>
                                                <ul class="list-unstyled">
                                                    ${assignment.attachments.map(att => `
                                                        <li><a href="${att.url}" target="_blank">${att.filename}</a></li>
                                                    `).join('')}
                                                </ul>
                                            ` : ''}
                                        </div>
                                    </div>
                                    
                                    <div class="card">
                                        <div class="card-header d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">学生提交情况 (${submissions.length}个)</h6>
                                            <button class="btn btn-sm btn-primary" onclick="gradeAssignment('${assignmentId}')">
                                                <i class="fas fa-check"></i> 批量批改
                                            </button>
                                        </div>
                                        <div class="card-body">
                                            <div class="table-responsive" style="max-height: 300px;">
                                                <table class="table table-sm table-hover">
                                                    <thead class="table-light">
                                                        <tr>
                                                            <th>学号</th>
                                                            <th>姓名</th>
                                                            <th>提交时间</th>
                                                            <th>状态</th>
                                                            <th>分数</th>
                                                            <th>操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${submissions.map(submission => `
                                                            <tr>
                                                                <td>${submission.student?.studentId || '未知'}</td>
                                                                <td>${submission.student?.name || '未知学生'}</td>
                                                                <td>${submission.submittedAt ? formatDateTime(submission.submittedAt) : '未提交'}</td>
                                                                <td>
                                                                    <span class="badge bg-${getSubmissionStatusColor(submission.status)}">
                                                                        ${getSubmissionStatusText(submission.status)}
                                                                    </span>
                                                                    ${submission.isLate ? '<span class="badge bg-warning ms-1">迟交</span>' : ''}
                                                                </td>
                                                                <td>${submission.grade?.score || '-'}</td>
                                                                <td>
                                                                    <button class="btn btn-xs btn-outline-primary" onclick="gradeSubmission('${submission._id}')">
                                                                        <i class="fas fa-edit"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <button type="button" class="btn btn-primary" onclick="bootstrap.Modal.getInstance($('#viewAssignmentModal')).hide(); editAssignment('${assignmentId}')">编辑作业</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#viewAssignmentModal')).show();
    } catch (error) {
        showAlert('加载作业详情失败', 'danger');
    }
}

async function editAssignment(assignmentId) {
    try {
        const response = await api.get(`/assignments/${assignmentId}`);
        const assignment = response.data;
        
        // 获取课程列表
        const coursesResponse = await api.get('/courses');
        const courses = coursesResponse.data;
        
        cleanupModal('editAssignmentModal');
        const modalHtml = `
            <div class="modal fade" id="editAssignmentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">编辑作业</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editAssignmentForm">
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="mb-3">
                                            <label class="form-label">作业标题</label>
                                            <input type="text" class="form-control" name="title" value="${assignment.title}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label">作业类型</label>
                                            <select class="form-control" name="type" required>
                                                <option value="homework" ${assignment.type === 'homework' ? 'selected' : ''}>作业</option>
                                                <option value="exam" ${assignment.type === 'exam' ? 'selected' : ''}>考试</option>
                                                <option value="project" ${assignment.type === 'project' ? 'selected' : ''}>项目</option>
                                                <option value="quiz" ${assignment.type === 'quiz' ? 'selected' : ''}>测验</option>
                                                <option value="lab" ${assignment.type === 'lab' ? 'selected' : ''}>实验</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">所属课程</label>
                                            <select class="form-control" name="course" required>
                                                ${courses.map(course => `
                                                    <option value="${course._id}" ${assignment.course?._id === course._id ? 'selected' : ''}>
                                                        ${course.name}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">总分</label>
                                            <input type="number" class="form-control" name="totalPoints" value="${assignment.totalPoints}" min="1" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">开始时间</label>
                                            <input type="datetime-local" class="form-control" name="startDate" 
                                                   value="${assignment.startDate ? new Date(assignment.startDate).toISOString().slice(0, 16) : ''}">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">截止时间</label>
                                            <input type="datetime-local" class="form-control" name="dueDate" 
                                                   value="${assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : ''}" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">允许提交次数</label>
                                            <input type="number" class="form-control" name="attempts" value="${assignment.attempts}" min="1" max="10">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">作业状态</label>
                                            <select class="form-control" name="isPublished">
                                                <option value="false" ${!assignment.isPublished ? 'selected' : ''}>草稿</option>
                                                <option value="true" ${assignment.isPublished ? 'selected' : ''}>已发布</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="lateSubmissionAllowed" 
                                               ${assignment.lateSubmission?.allowed ? 'checked' : ''}>
                                        <label class="form-check-label">允许延迟提交</label>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">作业描述</label>
                                    <textarea class="form-control" name="description" rows="4">${assignment.description || ''}</textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">作业要求</label>
                                    <textarea class="form-control" name="requirements" rows="3">${assignment.requirements || ''}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitEditAssignment('${assignmentId}')">保存更改</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#editAssignmentModal')).show();
    } catch (error) {
        showAlert('加载作业信息失败', 'danger');
    }
}

async function gradeAssignment(assignmentId) {
    try {
        const response = await api.get(`/assignments/${assignmentId}/submissions`);
        const submissions = response.data || [];
        
        cleanupModal('gradeAssignmentModal');
        const modalHtml = `
            <div class="modal fade" id="gradeAssignmentModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">批改作业</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <div class="row">
                                    <div class="col-md-6">
                                        <button class="btn btn-success btn-sm" onclick="batchGrade('pass')">
                                            <i class="fas fa-check"></i> 批量通过
                                        </button>
                                        <button class="btn btn-warning btn-sm ms-2" onclick="batchGrade('review')">
                                            <i class="fas fa-eye"></i> 标记复查
                                        </button>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <span class="text-muted">共 ${submissions.length} 份作业</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>
                                                <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                            </th>
                                            <th>学号</th>
                                            <th>姓名</th>
                                            <th>提交时间</th>
                                            <th>当前分数</th>
                                            <th>新分数</th>
                                            <th>评语</th>
                                            <th>状态</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${submissions.map(submission => `
                                            <tr>
                                                <td>
                                                    <input type="checkbox" name="selectedSubmissions" value="${submission._id}">
                                                </td>
                                                <td>${submission.student?.studentId || '未知'}</td>
                                                <td>${submission.student?.name || '未知学生'}</td>
                                                <td>${submission.submittedAt ? formatDateTime(submission.submittedAt) : '未提交'}</td>
                                                <td>${submission.grade?.score || '-'}</td>
                                                <td>
                                                    <input type="number" class="form-control form-control-sm" 
                                                           name="score_${submission._id}" 
                                                           value="${submission.grade?.score || ''}" 
                                                           min="0" max="100" style="width: 80px;">
                                                </td>
                                                <td>
                                                    <input type="text" class="form-control form-control-sm" 
                                                           name="comment_${submission._id}" 
                                                           value="${submission.grade?.comment || ''}" 
                                                           placeholder="评语" style="width: 150px;">
                                                </td>
                                                <td>
                                                    <span class="badge bg-${getSubmissionStatusColor(submission.status)}">
                                                        ${getSubmissionStatusText(submission.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitBatchGrading('${assignmentId}')">保存批改结果</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#gradeAssignmentModal')).show();
    } catch (error) {
        showAlert('加载作业提交失败', 'danger');
    }
}

async function downloadResource(resourceId) {
    try {
        const response = await fetch(`/api/learning/resources/${resourceId}/download`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '下载失败');
        }
        
        // 获取文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `resource_${resourceId}`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (filenameMatch && filenameMatch[1]) {
                filename = decodeURIComponent(filenameMatch[1].replace(/["']/g, ''));
            }
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showAlert('资源下载成功', 'success');
    } catch (error) {
        console.error('下载错误:', error);
        showAlert(`下载资源失败: ${error.message}`, 'danger');
    }
}

async function viewDiscussion(discussionId) {
    try {
        const response = await api.get(`/learning/discussions/${discussionId}`);
        const discussion = response.data;
        
        cleanupModal('viewDiscussionModal');
        const modalHtml = `
            <div class="modal fade" id="viewDiscussionModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <span class="badge bg-${discussion.type === 'announcement' ? 'warning' : 'primary'} me-2">
                                    ${getDiscussionTypeText(discussion.type)}
                                </span>
                                ${discussion.title}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="discussion-header mb-4">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <p class="mb-2">${discussion.content || discussion.description || '暂无内容'}</p>
                                        <small class="text-muted">
                                            由 <strong>${discussion.creator?.name || '匿名'}</strong> 创建于 ${formatDateTime(discussion.createdAt)}
                                            ${discussion.course ? ` · 课程: ${discussion.course.name}` : ''}
                                            ${discussion.class ? ` · 班级: ${discussion.class.name}` : ''}
                                        </small>
                                    </div>
                                    <div class="text-end">
                                        <span class="badge bg-${discussion.isLocked ? 'danger' : 'success'}">
                                            ${discussion.isLocked ? '已锁定' : '开放讨论'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="discussion-posts" style="max-height: 400px; overflow-y: auto;">
                                ${discussion.posts?.length > 0 ? discussion.posts.map(post => `
                                    <div class="post mb-3 p-3 border rounded">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <strong>${post.author?.name || '匿名用户'}</strong>
                                                <small class="text-muted ms-2">${formatDateTime(post.date)}</small>
                                            </div>
                                            <div>
                                                <button class="btn btn-sm btn-outline-primary" onclick="replyToPost('${post._id}')">
                                                    <i class="fas fa-reply"></i> 回复
                                                </button>
                                            </div>
                                        </div>
                                        <div class="post-content">
                                            <p>${post.content}</p>
                                            ${post.attachments?.length > 0 ? `
                                                <div class="attachments mt-2">
                                                    <small class="text-muted">附件:</small>
                                                    <ul class="list-unstyled">
                                                        ${post.attachments.map(att => `
                                                            <li><a href="${att.url}" target="_blank">${att.filename}</a></li>
                                                        `).join('')}
                                                    </ul>
                                                </div>
                                            ` : ''}
                                        </div>
                                        
                                        ${post.replies?.length > 0 ? `
                                            <div class="replies ms-4 mt-3">
                                                ${post.replies.map(reply => `
                                                    <div class="reply p-2 border-start border-3 border-secondary bg-light mb-2">
                                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                                            <small><strong>${reply.author?.name || '匿名'}</strong></small>
                                                            <small class="text-muted">${formatDateTime(reply.date)}</small>
                                                        </div>
                                                        <p class="mb-0 small">${reply.content}</p>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('') : '<p class="text-muted text-center">暂无回复</p>'}
                            </div>
                            
                            ${!discussion.isLocked ? `
                                <div class="new-post mt-4">
                                    <h6>参与讨论</h6>
                                    <form id="newPostForm" enctype="multipart/form-data">
                                        <div class="mb-3">
                                            <textarea class="form-control" name="content" rows="3" placeholder="写下你的观点..." required></textarea>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">附件 (可选)</label>
                                            <input type="file" class="form-control" name="attachments" multiple
                                                   accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar">
                                            <small class="text-muted">支持上传图片、文档等文件，最多3个文件，每个文件不超过10MB</small>
                                        </div>
                                    </form>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            ${!discussion.isLocked ? `
                                <button type="button" class="btn btn-primary" onclick="submitNewPost('${discussionId}')">
                                    <i class="fas fa-paper-plane"></i> 发表回复
                                </button>
                            ` : ''}
                            ${currentUser?.role !== 'student' ? `
                                <button type="button" class="btn btn-warning" onclick="toggleDiscussionLock('${discussionId}', ${discussion.isLocked})">
                                    <i class="fas fa-${discussion.isLocked ? 'unlock' : 'lock'}"></i> 
                                    ${discussion.isLocked ? '解锁' : '锁定'}讨论
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#viewDiscussionModal')).show();
    } catch (error) {
        showAlert('加载讨论详情失败', 'danger');
    }
}

// 班级编辑提交函数
async function submitEditClass(classId) {
    try {
        const form = $('#editClassForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 处理教室信息
        if (data.building || data.room || data.floor) {
            data.classroom = {
                building: data.building,
                room: data.room,
                floor: parseInt(data.floor, 10) || 1
            };
            delete data.building;
            delete data.room;
            delete data.floor;
        }
        
        // 转换布尔值
        data.isActive = data.isActive === 'true';
        
        await api.put(`/classes/${classId}`, data);
        
        bootstrap.Modal.getInstance($('#editClassModal')).hide();
        showAlert('班级信息更新成功', 'success');
        showClassManagement();
    } catch (error) {
        showAlert('更新班级信息失败', 'danger');
    }
}

// 导出班级名单
async function exportClassList(classId) {
    try {
        const response = await api.get(`/students?class=${classId}&limit=100`);
        const students = response.data;
        
        // 创建CSV内容
        let csvContent = "学号,姓名,性别,联系电话,邮箱,状态\n";
        students.forEach(student => {
            csvContent += `${student.studentId},${student.name},${student.gender === 'male' ? '男' : '女'},${student.contactInfo?.phone || ''},${student.contactInfo?.email || ''},${getStatusText(student.enrollmentStatus)}\n`;
        });
        
        // 下载CSV文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `班级名单_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showAlert('班级名单导出成功', 'success');
    } catch (error) {
        showAlert('导出班级名单失败', 'danger');
    }
}

// 课程编辑提交函数
async function submitEditCourse(courseId) {
    try {
        const form = $('#editCourseForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 处理选课班级
        const checkboxes = form.querySelectorAll('input[name="enrolledClasses"]:checked');
        data.enrolledClasses = Array.from(checkboxes).map(cb => cb.value);
        
        // 转换数值类型
        if (data.credits) {data.credits = parseFloat(data.credits);}
        if (data.totalHours) {data.totalHours = parseInt(data.totalHours, 10);}
        data.isActive = data.isActive === 'true';
        
        await api.put(`/courses/${courseId}`, data);
        
        bootstrap.Modal.getInstance($('#editCourseModal')).hide();
        showAlert('课程信息更新成功', 'success');
        showCourseManagement();
    } catch (error) {
        showAlert('更新课程信息失败', 'danger');
    }
}

// 作业编辑提交函数
async function submitEditAssignment(assignmentId) {
    try {
        const form = $('#editAssignmentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // 处理延迟提交设置
        data.lateSubmission = {
            allowed: !!data.lateSubmissionAllowed
        };
        delete data.lateSubmissionAllowed;
        
        // 转换数值和布尔类型
        data.totalPoints = parseInt(data.totalPoints, 10);
        data.attempts = parseInt(data.attempts, 10);
        data.isPublished = data.isPublished === 'true';
        
        await api.put(`/assignments/${assignmentId}`, data);
        
        bootstrap.Modal.getInstance($('#editAssignmentModal')).hide();
        showAlert('作业信息更新成功', 'success');
        showAssignmentManagement();
    } catch (error) {
        showAlert('更新作业信息失败', 'danger');
    }
}

// 批量批改相关函数
function toggleSelectAll() {
    const selectAll = $('#selectAll').checked;
    $$('input[name="selectedSubmissions"]').forEach(checkbox => {
        checkbox.checked = selectAll;
    });
}

function batchGrade(action) {
    const selectedCheckboxes = $$('input[name="selectedSubmissions"]:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlert('请选择要批改的作业', 'warning');
        return;
    }
    
    selectedCheckboxes.forEach(checkbox => {
        const submissionId = checkbox.value;
        const scoreInput = $(`input[name="score_${submissionId}"]`);
        const commentInput = $(`input[name="comment_${submissionId}"]`);
        
        if (action === 'pass') {
            scoreInput.value = '85'; // 默认通过分数
            commentInput.value = '作业完成良好';
        } else if (action === 'review') {
            commentInput.value = '需要复查';
        }
    });
    
    showAlert(`已${action === 'pass' ? '批量设置通过分数' : '标记为需要复查'}`, 'success');
}

async function submitBatchGrading(assignmentId) {
    try {
        const submissions = [];
        const scoreInputs = $$('input[name^="score_"]');
        const commentInputs = $$('input[name^="comment_"]');
        
        scoreInputs.forEach(input => {
            const submissionId = input.name.replace('score_', '');
            const score = parseFloat(input.value);
            const commentInput = $(`input[name="comment_${submissionId}"]`);
            const comment = commentInput?.value || '';
            
            if (score >= 0) {
                submissions.push({
                    submissionId,
                    grade: {
                        score,
                        comment,
                        gradedAt: new Date().toISOString()
                    }
                });
            }
        });
        
        if (submissions.length === 0) {
            showAlert('请至少为一份作业打分', 'warning');
            return;
        }
        
        await api.post(`/assignments/${assignmentId}/batch-grade`, { submissions });
        
        bootstrap.Modal.getInstance($('#gradeAssignmentModal')).hide();
        showAlert(`成功批改 ${submissions.length} 份作业`, 'success');
        viewAssignment(assignmentId); // 刷新作业详情
    } catch (error) {
        showAlert('批量批改失败', 'danger');
    }
}

// 单个作业批改
async function gradeSubmission(submissionId) {
    try {
        const response = await api.get(`/submissions/${submissionId}`);
        const submission = response.data;
        
        cleanupModal('gradeSubmissionModal');
        const modalHtml = `
            <div class="modal fade" id="gradeSubmissionModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">批改作业 - ${submission.student?.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0">学生信息</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>学号:</strong> ${submission.student?.studentId}</p>
                                            <p><strong>姓名:</strong> ${submission.student?.name}</p>
                                            <p><strong>提交时间:</strong> ${formatDateTime(submission.submittedAt)}</p>
                                            <p><strong>提交次数:</strong> ${submission.attemptNumber}</p>
                                            ${submission.isLate ? '<p><span class="badge bg-warning">迟交</span></p>' : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-8">
                                    <div class="card mb-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">作业内容</h6>
                                        </div>
                                        <div class="card-body">
                                            <p>${submission.textSubmission || '无文本提交'}</p>
                                            ${submission.attachments?.length > 0 ? `
                                                <hr>
                                                <h6>附件:</h6>
                                                <ul class="list-unstyled">
                                                    ${submission.attachments.map(att => `
                                                        <li><a href="${att.url}" target="_blank">${att.filename}</a></li>
                                                    `).join('')}
                                                </ul>
                                            ` : ''}
                                        </div>
                                    </div>
                                    
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0">批改</h6>
                                        </div>
                                        <div class="card-body">
                                            <form id="gradeSubmissionForm">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">分数</label>
                                                            <input type="number" class="form-control" name="score" 
                                                                   value="${submission.grade?.score || ''}" 
                                                                   min="0" max="${submission.assignment?.totalPoints || 100}" required>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="mb-3">
                                                            <label class="form-label">等级</label>
                                                            <select class="form-control" name="letterGrade">
                                                                <option value="A" ${submission.grade?.letterGrade === 'A' ? 'selected' : ''}>A (优秀)</option>
                                                                <option value="B" ${submission.grade?.letterGrade === 'B' ? 'selected' : ''}>B (良好)</option>
                                                                <option value="C" ${submission.grade?.letterGrade === 'C' ? 'selected' : ''}>C (中等)</option>
                                                                <option value="D" ${submission.grade?.letterGrade === 'D' ? 'selected' : ''}>D (及格)</option>
                                                                <option value="F" ${submission.grade?.letterGrade === 'F' ? 'selected' : ''}>F (不及格)</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="mb-3">
                                                    <label class="form-label">评语</label>
                                                    <textarea class="form-control" name="comment" rows="4">${submission.grade?.comment || ''}</textarea>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" onclick="submitSingleGrade('${submissionId}')">保存批改</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('body').insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal($('#gradeSubmissionModal')).show();
    } catch (error) {
        showAlert('加载作业提交失败', 'danger');
    }
}

async function submitSingleGrade(submissionId) {
    try {
        const form = $('#gradeSubmissionForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        const gradeData = {
            score: parseFloat(data.score),
            letterGrade: data.letterGrade,
            comment: data.comment,
            gradedAt: new Date().toISOString()
        };
        
        await api.put(`/submissions/${submissionId}/grade`, gradeData);
        
        bootstrap.Modal.getInstance($('#gradeSubmissionModal')).hide();
        showAlert('作业批改成功', 'success');
    } catch (error) {
        showAlert('批改作业失败', 'danger');
    }
}

// 提交状态相关工具函数
function getSubmissionStatusColor(status) {
    const statusColors = {
        'submitted': 'primary',
        'graded': 'success',
        'returned': 'info',
        'draft': 'secondary',
        'late': 'warning'
    };
    return statusColors[status] || 'secondary';
}

function getSubmissionStatusText(status) {
    const statusTexts = {
        'submitted': '已提交',
        'graded': '已批改',
        'returned': '已返回',
        'draft': '草稿',
        'late': '迟交'
    };
    return statusTexts[status] || '未知';
}

// 文件预览和处理相关函数
function previewFile(input) {
    const file = input.files[0];
    if (!file) {
        $('#filePreview').style.display = 'none';
        return;
    }
    
    // 检查文件大小 (10MB限制)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showAlert('文件大小超过10MB限制', 'danger');
        input.value = '';
        return;
    }
    
    // 显示文件预览
    $('#fileName').textContent = file.name;
    $('#fileSize').textContent = formatFileSize(file.size);
    
    // 根据文件类型设置图标
    const fileExt = file.name.split('.').pop().toLowerCase();
    const iconClass = getFileIconClass(fileExt);
    $('#fileIcon').className = `fas ${iconClass} fa-2x text-primary me-3`;
    
    // 自动设置资源类型
    const resourceType = detectResourceType(fileExt);
    if (resourceType) {
        $('select[name="type"]').value = resourceType;
    }
    
    // 自动填充标题（如果为空）
    const titleInput = $('input[name="title"]');
    if (!titleInput.value) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
    }
    
    $('#filePreview').style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIconClass(extension) {
    const iconMap = {
        // 文档
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'txt': 'fa-file-alt',
        // 表格
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'csv': 'fa-file-csv',
        // 演示文稿
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        // 图片
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image',
        'gif': 'fa-file-image',
        'bmp': 'fa-file-image',
        // 视频
        'mp4': 'fa-file-video',
        'avi': 'fa-file-video',
        'mov': 'fa-file-video',
        'wmv': 'fa-file-video',
        // 音频
        'mp3': 'fa-file-audio',
        'wav': 'fa-file-audio',
        'flac': 'fa-file-audio',
        // 压缩文件
        'zip': 'fa-file-archive',
        'rar': 'fa-file-archive',
        '7z': 'fa-file-archive'
    };
    return iconMap[extension] || 'fa-file';
}

function detectResourceType(extension) {
    const typeMap = {
        'pdf': 'document',
        'doc': 'document',
        'docx': 'document',
        'txt': 'document',
        'xls': 'spreadsheet',
        'xlsx': 'spreadsheet',
        'csv': 'spreadsheet',
        'ppt': 'presentation',
        'pptx': 'presentation',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'mp4': 'video',
        'avi': 'video',
        'mov': 'video',
        'mp3': 'audio',
        'wav': 'audio'
    };
    return typeMap[extension] || 'other';
}

function updateFileAccept(type) {
    const fileInput = $('#resourceFile');
    const acceptMap = {
        'document': '.pdf,.doc,.docx,.txt',
        'spreadsheet': '.xls,.xlsx,.csv',
        'presentation': '.ppt,.pptx',
        'image': '.jpg,.jpeg,.png,.gif,.bmp',
        'video': '.mp4,.avi,.mov,.wmv',
        'audio': '.mp3,.wav,.flac',
        'other': ''
    };
    
    if (fileInput && acceptMap[type]) {
        fileInput.accept = acceptMap[type];
    }
}

// 讨论区相关函数
async function submitNewPost(discussionId) {
    try {
        const form = $('#newPostForm');
        const formData = new FormData(form);

        // 验证内容
        const content = formData.get('content');
        if (!content || content.trim() === '') {
            showAlert('请输入回复内容', 'warning');
            return;
        }

        // 验证文件大小和数量
        const files = form.querySelector('input[name="attachments"]').files;
        if (files.length > 3) {
            showAlert('最多只能上传3个文件', 'warning');
            return;
        }

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { // 10MB
                showAlert(`文件 ${file.name} 超过10MB限制`, 'warning');
                return;
            }
        }

        // 使用FormData直接发送，包含文件
        await api.postFormData(`/learning/discussions/${discussionId}/participate`, formData);

        showAlert('回复发表成功', 'success');
        // 重新加载讨论详情
        viewDiscussion(discussionId);
    } catch (error) {
        console.error('发表回复失败:', error);
        showAlert('发表回复失败: ' + (error.message || '未知错误'), 'danger');
    }
}

let currentReplyToPostId = null;

function replyToPost(postId) {
    currentReplyToPostId = postId;
    
    // 显示回复输入框
    const replyHtml = `
        <div id="replyForm" class="mt-3 p-3 bg-light border rounded">
            <h6>回复该条评论</h6>
            <div class="mb-3">
                <textarea class="form-control" id="replyContent" rows="2" placeholder="写下你的回复..." required></textarea>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm" onclick="submitReply()">
                    <i class="fas fa-paper-plane"></i> 发送回复
                </button>
                <button class="btn btn-secondary btn-sm" onclick="cancelReply()">取消</button>
            </div>
        </div>
    `;
    
    // 移除现有的回复框
    const existingReply = $('#replyForm');
    if (existingReply) {
        existingReply.remove();
    }
    
    // 在对应的帖子后面添加回复框
    const postElement = document.querySelector(`[onclick="replyToPost('${postId}')"]`).closest('.post');
    postElement.insertAdjacentHTML('afterend', replyHtml);
    
    // 聚焦到回复输入框
    $('#replyContent').focus();
}

async function submitReply() {
    try {
        const content = $('#replyContent').value.trim();
        if (!content) {
            showAlert('请输入回复内容', 'warning');
            return;
        }
        
        const discussionId = new URL(window.location).hash.match(/discussion\/(.+)/)?.[1];
        
        const replyData = {
            content: content,
            replyTo: currentReplyToPostId
        };
        
        await api.post(`/learning/discussions/${discussionId}/participate`, replyData);
        
        showAlert('回复成功', 'success');
        cancelReply();
        // 重新加载讨论详情
        viewDiscussion(discussionId);
    } catch (error) {
        showAlert('回复失败', 'danger');
    }
}

function cancelReply() {
    const replyForm = $('#replyForm');
    if (replyForm) {
        replyForm.remove();
    }
    currentReplyToPostId = null;
}

async function toggleDiscussionLock(discussionId, isCurrentlyLocked) {
    try {
        const action = isCurrentlyLocked ? 'unlock' : 'lock';
        await api.put(`/learning/discussions/${discussionId}/${action}`);
        
        showAlert(`讨论${isCurrentlyLocked ? '解锁' : '锁定'}成功`, 'success');
        // 重新加载讨论详情
        viewDiscussion(discussionId);
    } catch (error) {
        showAlert(`${isCurrentlyLocked ? '解锁' : '锁定'}讨论失败`, 'danger');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);