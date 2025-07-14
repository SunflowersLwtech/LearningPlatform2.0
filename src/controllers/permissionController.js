const Staff = require('../models/Staff');
const { getUserPermissions, PERMISSIONS, ROLE_PERMISSIONS } = require('../utils/permissions');
const { createError, sendSuccessResponse, sendErrorResponse } = require('../utils/errorHandler');

/**
 * 获取所有可用权限列表
 */
exports.getAllPermissions = async (req, res) => {
  try {
    // 额外的权限检查 - 只允许staff用户访问
    if (req.userType === 'student') {
      return sendErrorResponse(res, createError.forbidden('学生无权访问权限管理功能'));
    }
    
    const permissionCategories = {
      system: {
        label: '系统管理',
        permissions: [
          { key: PERMISSIONS.SYSTEM_ADMIN, label: '系统管理', description: '系统全局管理权限' },
          { key: PERMISSIONS.SYSTEM_CONFIG, label: '系统配置', description: '修改系统配置' },
          { key: PERMISSIONS.SYSTEM_BACKUP, label: '系统备份', description: '执行系统备份和恢复' }
        ]
      },
      user: {
        label: '用户管理',
        permissions: [
          { key: PERMISSIONS.USER_CREATE, label: '创建用户', description: '创建新用户账户' },
          { key: PERMISSIONS.USER_READ, label: '查看用户', description: '查看用户信息' },
          { key: PERMISSIONS.USER_UPDATE, label: '更新用户', description: '修改用户信息' },
          { key: PERMISSIONS.USER_DELETE, label: '删除用户', description: '删除用户账户' },
          { key: PERMISSIONS.USER_MANAGE_ROLES, label: '管理角色', description: '分配和修改用户角色' }
        ]
      },
      student: {
        label: '学生管理',
        permissions: [
          { key: PERMISSIONS.STUDENT_CREATE, label: '创建学生', description: '添加新学生' },
          { key: PERMISSIONS.STUDENT_READ, label: '查看学生', description: '查看学生信息' },
          { key: PERMISSIONS.STUDENT_UPDATE, label: '更新学生', description: '修改学生信息' },
          { key: PERMISSIONS.STUDENT_DELETE, label: '删除学生', description: '删除学生记录' },
          { key: PERMISSIONS.STUDENT_GRADE_READ, label: '查看成绩', description: '查看学生成绩' },
          { key: PERMISSIONS.STUDENT_GRADE_WRITE, label: '录入成绩', description: '录入和修改成绩' },
          { key: PERMISSIONS.STUDENT_ATTENDANCE, label: '考勤管理', description: '管理学生考勤' }
        ]
      },
      staff: {
        label: '教职工管理',
        permissions: [
          { key: PERMISSIONS.STAFF_CREATE, label: '创建教职工', description: '添加新教职工' },
          { key: PERMISSIONS.STAFF_READ, label: '查看教职工', description: '查看教职工信息' },
          { key: PERMISSIONS.STAFF_UPDATE, label: '更新教职工', description: '修改教职工信息' },
          { key: PERMISSIONS.STAFF_DELETE, label: '删除教职工', description: '删除教职工记录' }
        ]
      },
      course: {
        label: '课程管理',
        permissions: [
          { key: PERMISSIONS.COURSE_CREATE, label: '创建课程', description: '创建新课程' },
          { key: PERMISSIONS.COURSE_READ, label: '查看课程', description: '查看课程信息' },
          { key: PERMISSIONS.COURSE_UPDATE, label: '更新课程', description: '修改课程信息' },
          { key: PERMISSIONS.COURSE_DELETE, label: '删除课程', description: '删除课程' },
          { key: PERMISSIONS.COURSE_ENROLL, label: '课程报名', description: '管理学生选课' }
        ]
      },
      class: {
        label: '班级管理',
        permissions: [
          { key: PERMISSIONS.CLASS_CREATE, label: '创建班级', description: '创建新班级' },
          { key: PERMISSIONS.CLASS_READ, label: '查看班级', description: '查看班级信息' },
          { key: PERMISSIONS.CLASS_UPDATE, label: '更新班级', description: '修改班级信息' },
          { key: PERMISSIONS.CLASS_DELETE, label: '删除班级', description: '删除班级' },
          { key: PERMISSIONS.CLASS_MANAGE_STUDENTS, label: '学生管理', description: '管理班级学生' }
        ]
      },
      assignment: {
        label: '作业管理',
        permissions: [
          { key: PERMISSIONS.ASSIGNMENT_CREATE, label: '创建作业', description: '布置新作业' },
          { key: PERMISSIONS.ASSIGNMENT_READ, label: '查看作业', description: '查看作业信息' },
          { key: PERMISSIONS.ASSIGNMENT_UPDATE, label: '更新作业', description: '修改作业信息' },
          { key: PERMISSIONS.ASSIGNMENT_DELETE, label: '删除作业', description: '删除作业' },
          { key: PERMISSIONS.ASSIGNMENT_GRADE, label: '作业评分', description: '评分和批改作业' }
        ]
      },
      report: {
        label: '报告权限',
        permissions: [
          { key: PERMISSIONS.REPORT_ACADEMIC, label: '学术报告', description: '查看学术相关报告' },
          { key: PERMISSIONS.REPORT_FINANCIAL, label: '财务报告', description: '查看财务报告' },
          { key: PERMISSIONS.REPORT_SYSTEM, label: '系统报告', description: '查看系统运行报告' },
          { key: PERMISSIONS.REPORT_EXPORT, label: '导出报告', description: '导出各类报告' }
        ]
      },
      schedule: {
        label: '日程管理',
        permissions: [
          { key: PERMISSIONS.SCHEDULE_CREATE, label: '创建日程', description: '创建新的日程安排' },
          { key: PERMISSIONS.SCHEDULE_READ, label: '查看日程', description: '查看日程安排' },
          { key: PERMISSIONS.SCHEDULE_UPDATE, label: '更新日程', description: '修改日程安排' },
          { key: PERMISSIONS.SCHEDULE_DELETE, label: '删除日程', description: '删除日程安排' }
        ]
      },
      file: {
        label: '文件管理',
        permissions: [
          { key: PERMISSIONS.FILE_UPLOAD, label: '上传文件', description: '上传文件到系统' },
          { key: PERMISSIONS.FILE_DOWNLOAD, label: '下载文件', description: '下载系统文件' },
          { key: PERMISSIONS.FILE_DELETE, label: '删除文件', description: '删除系统文件' },
          { key: PERMISSIONS.FILE_MANAGE, label: '文件管理', description: '完整的文件管理权限' }
        ]
      }
    };
    
    sendSuccessResponse(res, permissionCategories, '获取权限列表成功');
  } catch (error) {
    sendErrorResponse(res, createError.internal('获取权限列表失败'));
  }
};

/**
 * 获取所有角色及其权限配置
 */
exports.getRolePermissions = async (req, res) => {
  try {
    // 额外的安全检查 - 学生不能访问角色权限配置
    if (req.userType === 'student') {
      return sendErrorResponse(res, createError.forbidden('学生无权访问角色权限配置'));
    }
    
    const roleConfigurations = {
      admin: {
        label: '系统管理员',
        description: '拥有系统最高权限，可以执行所有操作',
        permissions: ROLE_PERMISSIONS.admin,
        level: 1
      },
      principal: {
        label: '校长',
        description: '学校最高管理者，拥有大部分管理权限',
        permissions: ROLE_PERMISSIONS.principal,
        level: 2
      },
      vice_principal: {
        label: '副校长',
        description: '协助校长管理学校，拥有教务管理权限',
        permissions: ROLE_PERMISSIONS.vice_principal,
        level: 3
      },
      director: {
        label: '主任',
        description: '部门负责人，负责具体业务管理',
        permissions: ROLE_PERMISSIONS.director,
        level: 4
      },
      head_teacher: {
        label: '班主任',
        description: '负责班级管理和学生管理',
        permissions: ROLE_PERMISSIONS.head_teacher,
        level: 5
      },
      teacher: {
        label: '教师',
        description: '负责教学工作，可以管理自己的课程和作业',
        permissions: ROLE_PERMISSIONS.teacher,
        level: 6
      }
    };
    
    sendSuccessResponse(res, roleConfigurations, '获取角色权限配置成功');
  } catch (error) {
    sendErrorResponse(res, createError.internal('获取角色权限配置失败'));
  }
};

/**
 * 获取用户的权限信息
 */
exports.getUserPermissions = async (req, res) => {
  try {
    // 学生只能查看自己的权限信息（尽管他们没有任何staff权限）
    if (req.userType === 'student') {
      const permissions = getUserPermissions(req.user, 'student');
      
      const userPermissionInfo = {
        userId: req.user._id,
        name: req.user.name,
        studentId: req.user.studentId,
        userType: 'student',
        permissions, // 这将是一个空数组
        message: '学生用户没有系统管理权限'
      };
      
      return sendSuccessResponse(res, userPermissionInfo, '获取用户权限成功');
    }
    
    // 对于staff用户的处理
    const userId = req.params.userId || req.user._id;
    
    // 确保只有高级管理员才能查看其他用户的权限
    if (userId !== req.user._id.toString() && 
        !['admin', 'principal', 'vice_principal'].includes(req.user.role)) {
      return sendErrorResponse(res, createError.forbidden('只能查看自己的权限信息'));
    }
    
    const user = await Staff.findById(userId);
    if (!user) {
      return sendErrorResponse(res, createError.notFound('用户不存在'));
    }
    
    const permissions = getUserPermissions(user, 'staff');
    
    const userPermissionInfo = {
      userId: user._id,
      name: user.name,
      role: user.role,
      permissions,
      roleLabel: {
        admin: '系统管理员',
        principal: '校长',
        vice_principal: '副校长',
        director: '主任',
        head_teacher: '班主任',
        teacher: '教师'
      }[user.role] || '未知角色'
    };
    
    sendSuccessResponse(res, userPermissionInfo, '获取用户权限成功');
  } catch (error) {
    sendErrorResponse(res, createError.internal('获取用户权限失败'));
  }
};

/**
 * 更新用户角色（仅限高级管理员）
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole, reason } = req.body;
    
    if (!newRole) {
      return sendErrorResponse(res, createError.badRequest('请提供新角色'));
    }
    
    // 验证角色有效性
    const validRoles = ['admin', 'principal', 'vice_principal', 'director', 'head_teacher', 'teacher'];
    if (!validRoles.includes(newRole)) {
      return sendErrorResponse(res, createError.badRequest('无效的角色'));
    }
    
    // 确保操作者有足够权限
    const operatorRoleLevel = {
      admin: 1, principal: 2, vice_principal: 3, director: 4, head_teacher: 5, teacher: 6
    };
    
    const operatorLevel = operatorRoleLevel[req.user.role];
    const newRoleLevel = operatorRoleLevel[newRole];
    
    // 不能提升到比自己更高的权限
    if (newRoleLevel <= operatorLevel && req.user.role !== 'admin') {
      return sendErrorResponse(res, createError.forbidden('不能分配等于或高于自己权限的角色'));
    }
    
    const targetUser = await Staff.findById(userId);
    if (!targetUser) {
      return sendErrorResponse(res, createError.notFound('目标用户不存在'));
    }
    
    // 不能降低自己的权限
    if (targetUser._id.toString() === req.user._id.toString() && req.user.role === 'admin') {
      return sendErrorResponse(res, createError.forbidden('不能修改自己的角色'));
    }
    
    const oldRole = targetUser.role;
    targetUser.role = newRole;
    
    // 记录角色变更历史
    if (!targetUser.roleHistory) {
      targetUser.roleHistory = [];
    }
    
    targetUser.roleHistory.push({
      oldRole,
      newRole,
      changedBy: req.user._id,
      changeDate: new Date(),
      reason: reason || '管理员操作'
    });
    
    await targetUser.save();
    
    const updatedUser = await Staff.findById(userId)
      .populate('roleHistory.changedBy', 'name role')
      .select('-password');
    
    sendSuccessResponse(res, {
      user: updatedUser,
      oldRole,
      newRole,
      operatedBy: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    }, '用户角色更新成功');
    
  } catch (error) {
    sendErrorResponse(res, createError.internal('更新用户角色失败'));
  }
};

/**
 * 获取权限检查结果（用于前端权限控制）
 */
exports.checkPermissions = async (req, res) => {
  try {
    const { permissions: requestedPermissions } = req.body;
    
    if (!Array.isArray(requestedPermissions)) {
      return sendErrorResponse(res, createError.badRequest('权限列表必须是数组'));
    }
    
    const userPermissions = getUserPermissions(req.user, req.userType);
    const permissionResults = {};
    
    requestedPermissions.forEach(permission => {
      permissionResults[permission] = userPermissions.includes(permission);
    });
    
    sendSuccessResponse(res, {
      userRole: req.user?.role || req.userType,
      permissionResults,
      allUserPermissions: userPermissions
    }, '权限检查完成');
    
  } catch (error) {
    sendErrorResponse(res, createError.internal('权限检查失败'));
  }
};

/**
 * 获取角色变更历史
 */
exports.getRoleHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await Staff.findById(userId)
      .populate('roleHistory.changedBy', 'name role staffId')
      .select('name role roleHistory');
    
    if (!user) {
      return sendErrorResponse(res, createError.notFound('用户不存在'));
    }
    
    // 确保只有高级管理员或用户本人才能查看角色历史
    if (userId !== req.user._id.toString() && 
        !['admin', 'principal'].includes(req.user.role)) {
      return sendErrorResponse(res, createError.forbidden('无权查看此用户的角色历史'));
    }
    
    sendSuccessResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        currentRole: user.role
      },
      roleHistory: user.roleHistory || []
    }, '获取角色历史成功');
    
  } catch (error) {
    sendErrorResponse(res, createError.internal('获取角色历史失败'));
  }
};