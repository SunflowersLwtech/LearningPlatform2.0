/**
 * 增强的权限管理系统
 * 提供细粒度的权限控制和角色管理
 */

// 定义所有可用的权限
const PERMISSIONS = {
  // 系统管理权限
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_BACKUP: 'system:backup',
  
  // 用户管理权限
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',
  
  // 学生管理权限
  STUDENT_CREATE: 'student:create',
  STUDENT_READ: 'student:read',
  STUDENT_UPDATE: 'student:update',
  STUDENT_DELETE: 'student:delete',
  STUDENT_GRADE_READ: 'student:grade_read',
  STUDENT_GRADE_WRITE: 'student:grade_write',
  STUDENT_ATTENDANCE: 'student:attendance',
  
  // 教职工管理权限
  STAFF_CREATE: 'staff:create',
  STAFF_READ: 'staff:read',
  STAFF_UPDATE: 'staff:update',
  STAFF_DELETE: 'staff:delete',
  
  // 课程管理权限
  COURSE_CREATE: 'course:create',
  COURSE_READ: 'course:read',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',
  COURSE_ENROLL: 'course:enroll',
  
  // 班级管理权限
  CLASS_CREATE: 'class:create',
  CLASS_READ: 'class:read',
  CLASS_UPDATE: 'class:update',
  CLASS_DELETE: 'class:delete',
  CLASS_MANAGE_STUDENTS: 'class:manage_students',
  
  // 作业管理权限
  ASSIGNMENT_CREATE: 'assignment:create',
  ASSIGNMENT_READ: 'assignment:read',
  ASSIGNMENT_UPDATE: 'assignment:update',
  ASSIGNMENT_DELETE: 'assignment:delete',
  ASSIGNMENT_GRADE: 'assignment:grade',
  
  // 报告权限
  REPORT_ACADEMIC: 'report:academic',
  REPORT_FINANCIAL: 'report:financial',
  REPORT_SYSTEM: 'report:system',
  REPORT_EXPORT: 'report:export',
  
  // 日程安排权限
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_READ: 'schedule:read',
  SCHEDULE_UPDATE: 'schedule:update',
  SCHEDULE_DELETE: 'schedule:delete',
  
  // 文件管理权限
  FILE_UPLOAD: 'file:upload',
  FILE_DOWNLOAD: 'file:download',
  FILE_DELETE: 'file:delete',
  FILE_MANAGE: 'file:manage'
};

// 角色权限映射
const ROLE_PERMISSIONS = {
  // 系统管理员 - 拥有所有权限
  admin: Object.values(PERMISSIONS),
  
  // 校长 - 几乎所有权限，除了系统配置
  principal: [
    PERMISSIONS.USER_CREATE, PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_MANAGE_ROLES,
    PERMISSIONS.STUDENT_CREATE, PERMISSIONS.STUDENT_READ, PERMISSIONS.STUDENT_UPDATE, PERMISSIONS.STUDENT_DELETE,
    PERMISSIONS.STUDENT_GRADE_READ, PERMISSIONS.STUDENT_GRADE_WRITE, PERMISSIONS.STUDENT_ATTENDANCE,
    PERMISSIONS.STAFF_CREATE, PERMISSIONS.STAFF_READ, PERMISSIONS.STAFF_UPDATE, PERMISSIONS.STAFF_DELETE,
    PERMISSIONS.COURSE_CREATE, PERMISSIONS.COURSE_READ, PERMISSIONS.COURSE_UPDATE, PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.COURSE_ENROLL,
    PERMISSIONS.CLASS_CREATE, PERMISSIONS.CLASS_READ, PERMISSIONS.CLASS_UPDATE, PERMISSIONS.CLASS_DELETE,
    PERMISSIONS.CLASS_MANAGE_STUDENTS,
    PERMISSIONS.ASSIGNMENT_CREATE, PERMISSIONS.ASSIGNMENT_READ, PERMISSIONS.ASSIGNMENT_UPDATE, 
    PERMISSIONS.ASSIGNMENT_DELETE, PERMISSIONS.ASSIGNMENT_GRADE,
    PERMISSIONS.REPORT_ACADEMIC, PERMISSIONS.REPORT_FINANCIAL, PERMISSIONS.REPORT_SYSTEM, PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SCHEDULE_CREATE, PERMISSIONS.SCHEDULE_READ, PERMISSIONS.SCHEDULE_UPDATE, PERMISSIONS.SCHEDULE_DELETE,
    PERMISSIONS.FILE_UPLOAD, PERMISSIONS.FILE_DOWNLOAD, PERMISSIONS.FILE_DELETE, PERMISSIONS.FILE_MANAGE
  ],
  
  // 副校长 - 大部分管理权限
  vice_principal: [
    PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE,
    PERMISSIONS.STUDENT_CREATE, PERMISSIONS.STUDENT_READ, PERMISSIONS.STUDENT_UPDATE,
    PERMISSIONS.STUDENT_GRADE_READ, PERMISSIONS.STUDENT_GRADE_WRITE, PERMISSIONS.STUDENT_ATTENDANCE,
    PERMISSIONS.STAFF_READ, PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.COURSE_CREATE, PERMISSIONS.COURSE_READ, PERMISSIONS.COURSE_UPDATE, PERMISSIONS.COURSE_ENROLL,
    PERMISSIONS.CLASS_CREATE, PERMISSIONS.CLASS_READ, PERMISSIONS.CLASS_UPDATE, PERMISSIONS.CLASS_MANAGE_STUDENTS,
    PERMISSIONS.ASSIGNMENT_CREATE, PERMISSIONS.ASSIGNMENT_READ, PERMISSIONS.ASSIGNMENT_UPDATE, PERMISSIONS.ASSIGNMENT_GRADE,
    PERMISSIONS.REPORT_ACADEMIC, PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SCHEDULE_CREATE, PERMISSIONS.SCHEDULE_READ, PERMISSIONS.SCHEDULE_UPDATE,
    PERMISSIONS.FILE_UPLOAD, PERMISSIONS.FILE_DOWNLOAD, PERMISSIONS.FILE_MANAGE
  ],
  
  // 主任 - 教务管理权限
  director: [
    PERMISSIONS.STUDENT_READ, PERMISSIONS.STUDENT_UPDATE, PERMISSIONS.STUDENT_GRADE_READ, PERMISSIONS.STUDENT_ATTENDANCE,
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.COURSE_READ, PERMISSIONS.COURSE_UPDATE, PERMISSIONS.COURSE_ENROLL,
    PERMISSIONS.CLASS_READ, PERMISSIONS.CLASS_UPDATE, PERMISSIONS.CLASS_MANAGE_STUDENTS,
    PERMISSIONS.ASSIGNMENT_READ, PERMISSIONS.ASSIGNMENT_UPDATE, PERMISSIONS.ASSIGNMENT_GRADE,
    PERMISSIONS.REPORT_ACADEMIC, PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SCHEDULE_READ, PERMISSIONS.SCHEDULE_UPDATE,
    PERMISSIONS.FILE_UPLOAD, PERMISSIONS.FILE_DOWNLOAD
  ],
  
  // 班主任 - 班级管理权限
  head_teacher: [
    PERMISSIONS.STUDENT_READ, PERMISSIONS.STUDENT_UPDATE, PERMISSIONS.STUDENT_GRADE_READ, PERMISSIONS.STUDENT_ATTENDANCE,
    PERMISSIONS.COURSE_READ, PERMISSIONS.ASSIGNMENT_READ, PERMISSIONS.ASSIGNMENT_CREATE, PERMISSIONS.ASSIGNMENT_UPDATE,
    PERMISSIONS.ASSIGNMENT_GRADE,
    PERMISSIONS.CLASS_READ, PERMISSIONS.CLASS_UPDATE, PERMISSIONS.CLASS_MANAGE_STUDENTS,
    PERMISSIONS.REPORT_ACADEMIC,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.FILE_UPLOAD, PERMISSIONS.FILE_DOWNLOAD
  ],
  
  // 普通教师 - 教学相关权限
  teacher: [
    PERMISSIONS.STUDENT_READ, PERMISSIONS.STUDENT_GRADE_READ, PERMISSIONS.STUDENT_GRADE_WRITE,
    PERMISSIONS.COURSE_READ, PERMISSIONS.ASSIGNMENT_READ, PERMISSIONS.ASSIGNMENT_CREATE, 
    PERMISSIONS.ASSIGNMENT_UPDATE, PERMISSIONS.ASSIGNMENT_GRADE,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.FILE_UPLOAD, PERMISSIONS.FILE_DOWNLOAD
  ]
};

// 资源访问规则
const RESOURCE_ACCESS_RULES = {
  // 学生资源访问规则
  student: {
    own: ['student'], // 学生只能访问自己的资源
    class: ['head_teacher'], // 班主任可以访问班级学生
    department: ['director'], // 主任可以访问部门相关学生
    school: ['principal', 'vice_principal', 'admin'] // 校长级别可以访问所有学生
  },
  
  // 成绩资源访问规则
  grade: {
    own: ['student'], // 学生只能查看自己的成绩
    class: ['head_teacher'], // 班主任可以查看班级成绩
    subject: ['teacher'], // 教师可以查看自己科目的成绩
    department: ['director'], // 主任可以查看部门成绩
    school: ['principal', 'vice_principal', 'admin'] // 校长级别可以查看所有成绩
  },
  
  // 课程资源访问规则
  course: {
    enrolled: ['student'], // 学生可以访问自己选修的课程
    teaching: ['teacher'], // 教师可以访问自己教授的课程
    department: ['director'], // 主任可以访问部门课程
    school: ['principal', 'vice_principal', 'admin'] // 校长级别可以访问所有课程
  }
};

/**
 * 检查用户是否拥有指定权限
 * @param {Object} user - 用户对象
 * @param {string} userType - 用户类型 (staff/student)
 * @param {string} permission - 权限名称
 * @returns {boolean} - 是否拥有权限
 */
function hasPermission(user, userType, permission) {
  // 权限检查日志
  
  // 学生没有staff权限
  if (userType === 'student') {
    // 学生用户被拒绝访问
    return false;
  }
  
  // 检查角色权限
  if (userType === 'staff') {
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasAccess = rolePermissions.includes(permission);
    // Staff用户权限检查结果
    return hasAccess;
  }
  
  // 未知用户类型
  return false;
}

/**
 * 检查用户是否可以访问指定资源
 * @param {Object} user - 用户对象
 * @param {string} userType - 用户类型
 * @param {string} resourceType - 资源类型
 * @param {Object} resource - 资源对象
 * @param {string} action - 操作类型
 * @returns {boolean} - 是否可以访问
 */
function canAccessResource(user, userType, resourceType, resource, action = 'read') {
  const rules = RESOURCE_ACCESS_RULES[resourceType];
  if (!rules) {return false;}
  
  // 检查自己的资源
  if (rules.own && rules.own.includes(userType)) {
    if (userType === 'student' && resource.student) {
      return resource.student.toString() === user._id.toString();
    }
    if (userType === 'student' && resource._id) {
      return resource._id.toString() === user._id.toString();
    }
  }
  
  // 检查staff权限
  if (userType === 'staff') {
    // 学校级别权限
    if (rules.school && rules.school.includes(user.role)) {
      return true;
    }
    
    // 部门级别权限
    if (rules.department && rules.department.includes(user.role)) {
      if (resource.department && user.department === resource.department) {
        return true;
      }
    }
    
    // 班级级别权限
    if (rules.class && rules.class.includes(user.role)) {
      if (resource.class && user.classes && user.classes.includes(resource.class)) {
        return true;
      }
    }
    
    // 科目级别权限（针对教师）
    if (rules.subject && rules.subject.includes(user.role)) {
      if (resource.subject && user.subjects && user.subjects.includes(resource.subject)) {
        return true;
      }
      if (resource.course && resource.course.teacher && 
          resource.course.teacher.toString() === user._id.toString()) {
        return true;
      }
    }
    
    // 教学权限（教师访问自己教授的课程）
    if (rules.teaching && rules.teaching.includes(user.role)) {
      if (resource.teacher && resource.teacher.toString() === user._id.toString()) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 获取用户的所有权限
 * @param {Object} user - 用户对象
 * @param {string} userType - 用户类型
 * @returns {Array} - 权限列表
 */
function getUserPermissions(user, userType) {
  if (userType === 'student') {
    return [];
  }
  
  return ROLE_PERMISSIONS[user.role] || [];
}

/**
 * 检查用户是否可以执行操作
 * @param {Object} user - 用户对象
 * @param {string} userType - 用户类型
 * @param {string} action - 操作类型
 * @param {Object} context - 上下文信息
 * @returns {boolean} - 是否可以执行
 */
function canPerformAction(user, userType, action, context = {}) {
  // 基础权限检查
  if (!hasPermission(user, userType, action)) {
    return false;
  }
  
  // 资源级别检查
  if (context.resource && context.resourceType) {
    return canAccessResource(user, userType, context.resourceType, context.resource, action);
  }
  
  return true;
}

/**
 * 获取权限错误信息
 * @param {string} permission - 权限名称
 * @param {string} userRole - 用户角色
 * @returns {string} - 错误信息
 */
function getPermissionError(permission, userRole) {
  const permissionMessages = {
    [PERMISSIONS.SYSTEM_ADMIN]: '系统管理权限',
    [PERMISSIONS.USER_CREATE]: '创建用户权限',
    [PERMISSIONS.USER_DELETE]: '删除用户权限',
    [PERMISSIONS.STUDENT_CREATE]: '创建学生权限',
    [PERMISSIONS.STUDENT_DELETE]: '删除学生权限',
    [PERMISSIONS.STAFF_CREATE]: '创建教职工权限',
    [PERMISSIONS.STAFF_DELETE]: '删除教职工权限',
    [PERMISSIONS.COURSE_CREATE]: '创建课程权限',
    [PERMISSIONS.COURSE_DELETE]: '删除课程权限'
  };
  
  const message = permissionMessages[permission] || '执行此操作的权限';
  return `角色 ${userRole} 缺少${message}`;
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  RESOURCE_ACCESS_RULES,
  hasPermission,
  canAccessResource,
  getUserPermissions,
  canPerformAction,
  getPermissionError
};