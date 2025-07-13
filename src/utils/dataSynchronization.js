/**
 * 数据同步工具
 * 提供事务处理、数据一致性维护和实时同步功能
 */

const mongoose = require('mongoose');
const { createError } = require('./errorHandler');
const { emitNotification, notifications } = require('./notifications');

/**
 * 高级事务处理器
 * 支持多步骤操作的原子性事务
 */
class TransactionManager {
  constructor() {
    this.session = null;
    this.operations = [];
    this.rollbackCallbacks = [];
  }

  async start() {
    this.session = await mongoose.startSession();
    this.session.startTransaction();
    return this;
  }

  /**
   * 添加操作到事务中
   * @param {Function} operation - 操作函数
   * @param {Function} rollback - 回滚函数
   */
  addOperation(operation, rollback = null) {
    this.operations.push(operation);
    if (rollback) {
      this.rollbackCallbacks.push(rollback);
    }
    return this;
  }

  /**
   * 执行所有操作
   */
  async execute() {
    try {
      const results = [];
      for (const operation of this.operations) {
        const result = await operation(this.session);
        results.push(result);
      }
      
      await this.session.commitTransaction();
      return results;
    } catch (error) {
      await this.session.abortTransaction();
      
      // 执行回滚回调
      for (const rollback of this.rollbackCallbacks) {
        try {
          await rollback();
        } catch (rollbackError) {
          console.error('回滚操作失败:', rollbackError);
        }
      }
      
      throw error;
    } finally {
      await this.session.endSession();
    }
  }

  /**
   * 取消事务
   */
  async cancel() {
    if (this.session) {
      await this.session.abortTransaction();
      await this.session.endSession();
    }
  }
}

/**
 * 数据同步管理器
 * 处理模型间的数据关联和一致性
 */
class DataSyncManager {
  constructor() {
    this.syncRules = new Map();
    this.cacheInvalidationRules = new Map();
  }

  /**
   * 注册同步规则
   * @param {string} modelName - 模型名称
   * @param {string} operation - 操作类型 (create/update/delete)
   * @param {Function} syncFunction - 同步函数
   */
  registerSyncRule(modelName, operation, syncFunction) {
    const key = `${modelName}:${operation}`;
    if (!this.syncRules.has(key)) {
      this.syncRules.set(key, []);
    }
    this.syncRules.get(key).push(syncFunction);
  }

  /**
   * 执行同步规则
   * @param {string} modelName - 模型名称
   * @param {string} operation - 操作类型
   * @param {Object} data - 数据对象
   * @param {Object} options - 选项
   */
  async executeSync(modelName, operation, data, options = {}) {
    const key = `${modelName}:${operation}`;
    const rules = this.syncRules.get(key) || [];
    
    const results = [];
    for (const rule of rules) {
      try {
        const result = await rule(data, options);
        results.push(result);
      } catch (error) {
        console.error(`同步规则执行失败 ${key}:`, error);
        if (!options.ignoreErrors) {
          throw error;
        }
      }
    }
    
    return results;
  }

  /**
   * 注册缓存失效规则
   * @param {string} modelName - 模型名称
   * @param {Array} cacheKeys - 需要失效的缓存键
   */
  registerCacheInvalidation(modelName, cacheKeys) {
    this.cacheInvalidationRules.set(modelName, cacheKeys);
  }

  /**
   * 执行缓存失效
   * @param {string} modelName - 模型名称
   * @param {Object} data - 数据对象
   */
  async invalidateCache(modelName, data) {
    const cacheKeys = this.cacheInvalidationRules.get(modelName) || [];
    
    // 这里可以集成 Redis 等缓存系统
    for (const keyTemplate of cacheKeys) {
      const cacheKey = this.interpolateCacheKey(keyTemplate, data);
      // TODO: 实际的缓存失效逻辑
      console.log(`缓存失效: ${cacheKey}`);
    }
  }

  /**
   * 插值缓存键模板
   */
  interpolateCacheKey(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}

// 全局同步管理器实例
const dataSyncManager = new DataSyncManager();

/**
 * 模型关联更新器
 * 处理模型间的关联关系更新
 */
class RelationshipUpdater {
  /**
   * 更新学生-班级关联
   * @param {string} studentId - 学生ID
   * @param {string} oldClassId - 原班级ID
   * @param {string} newClassId - 新班级ID
   * @param {Object} session - 事务会话
   */
  static async updateStudentClassRelation(studentId, oldClassId, newClassId, session) {
    const Class = require('../models/Class');
    
    const operations = [];
    
    // 从原班级移除学生
    if (oldClassId) {
      operations.push(
        Class.findByIdAndUpdate(
          oldClassId,
          { 
            $pull: { students: studentId },
            $inc: { currentEnrollment: -1 }
          },
          { session, new: true }
        )
      );
    }
    
    // 添加到新班级
    if (newClassId) {
      operations.push(
        Class.findByIdAndUpdate(
          newClassId,
          { 
            $addToSet: { students: studentId },
            $inc: { currentEnrollment: 1 }
          },
          { session, new: true }
        )
      );
    }
    
    return await Promise.all(operations);
  }

  /**
   * 更新课程-班级关联
   * @param {string} courseId - 课程ID
   * @param {Array} classIds - 班级ID数组
   * @param {Object} session - 事务会话
   */
  static async updateCourseClassRelation(courseId, classIds, session) {
    const Course = require('../models/Course');
    const Class = require('../models/Class');
    
    // 获取原有的班级关联
    const course = await Course.findById(courseId).session(session);
    const oldClassIds = course.enrolledClasses || [];
    
    // 计算需要添加和移除的班级
    const toAdd = classIds.filter(id => !oldClassIds.includes(id));
    const toRemove = oldClassIds.filter(id => !classIds.includes(id));
    
    const operations = [];
    
    // 更新课程的班级列表
    operations.push(
      Course.findByIdAndUpdate(
        courseId,
        { enrolledClasses: classIds },
        { session, new: true }
      )
    );
    
    // 从移除的班级中删除课程引用
    for (const classId of toRemove) {
      operations.push(
        Class.findByIdAndUpdate(
          classId,
          { $pull: { enrolledCourses: courseId } },
          { session }
        )
      );
    }
    
    // 向新班级添加课程引用
    for (const classId of toAdd) {
      operations.push(
        Class.findByIdAndUpdate(
          classId,
          { $addToSet: { enrolledCourses: courseId } },
          { session }
        )
      );
    }
    
    return await Promise.all(operations);
  }

  /**
   * 更新教师-班级关联
   * @param {string} teacherId - 教师ID
   * @param {Array} classIds - 班级ID数组
   * @param {Object} session - 事务会话
   */
  static async updateTeacherClassRelation(teacherId, classIds, session) {
    const Staff = require('../models/Staff');
    const Class = require('../models/Class');
    
    // 获取教师当前的班级
    const teacher = await Staff.findById(teacherId).session(session);
    const oldClassIds = teacher.classes || [];
    
    // 计算变更
    const toAdd = classIds.filter(id => !oldClassIds.includes(id));
    const toRemove = oldClassIds.filter(id => !classIds.includes(id));
    
    const operations = [];
    
    // 更新教师的班级列表
    operations.push(
      Staff.findByIdAndUpdate(
        teacherId,
        { classes: classIds },
        { session, new: true }
      )
    );
    
    // 更新班级的教师引用
    for (const classId of toRemove) {
      operations.push(
        Class.findByIdAndUpdate(
          classId,
          { $unset: { headTeacher: "" } },
          { session }
        )
      );
    }
    
    for (const classId of toAdd) {
      operations.push(
        Class.findByIdAndUpdate(
          classId,
          { headTeacher: teacherId },
          { session }
        )
      );
    }
    
    return await Promise.all(operations);
  }
}

/**
 * 实时通知管理器
 * 处理数据变更的实时通知
 */
class RealtimeNotificationManager {
  /**
   * 发送学生相关通知
   * @param {string} type - 通知类型
   * @param {Object} studentData - 学生数据
   * @param {Object} additionalData - 额外数据
   */
  static async notifyStudentUpdate(type, studentData, additionalData = {}) {
    const notificationData = {
      type: `student.${type}`,
      student: {
        id: studentData._id,
        name: studentData.name,
        studentId: studentData.studentId,
        class: studentData.class
      },
      timestamp: new Date(),
      ...additionalData
    };

    // 发送实时数据同步通知
    notifications.dataSync.broadcastDataUpdate(
      'student',
      studentData._id,
      studentData,
      type,
      additionalData
    );

    // 传统通知
    // 通知班级相关人员
    if (studentData.class) {
      emitNotification('class', studentData.class, notificationData);
    }

    // 通知班主任
    const Class = require('../models/Class');
    const classInfo = await Class.findById(studentData.class).populate('headTeacher');
    if (classInfo && classInfo.headTeacher) {
      emitNotification('user', classInfo.headTeacher._id, notificationData);
    }

    // 通知管理员
    emitNotification('role', 'admin', notificationData);
    emitNotification('role', 'principal', notificationData);

    // 如果是班级变更，发送关联变更通知
    if (type === 'class_changed' && additionalData.oldClass && additionalData.newClass) {
      notifications.dataSync.broadcastRelationshipChange(
        'student',
        studentData._id,
        'student_class',
        {
          type: 'class',
          id: additionalData.newClass._id,
          name: additionalData.newClass.name
        },
        'update',
        {
          oldClass: additionalData.oldClass,
          newClass: additionalData.newClass,
          operator: additionalData.operator
        }
      );
    }
  }

  /**
   * 发送课程相关通知
   * @param {string} type - 通知类型
   * @param {Object} courseData - 课程数据
   * @param {Object} additionalData - 额外数据
   */
  static async notifyCourseUpdate(type, courseData, additionalData = {}) {
    const notificationData = {
      type: `course.${type}`,
      course: {
        id: courseData._id,
        name: courseData.name,
        courseId: courseData.courseId,
        teacher: courseData.teacher
      },
      timestamp: new Date(),
      ...additionalData
    };

    // 发送实时数据同步通知
    notifications.dataSync.broadcastDataUpdate(
      'course',
      courseData._id,
      courseData,
      type,
      additionalData
    );

    // 通知选修班级的学生
    if (courseData.enrolledClasses && courseData.enrolledClasses.length > 0) {
      for (const classId of courseData.enrolledClasses) {
        emitNotification('class', classId, notificationData);
      }
    }

    // 通知授课教师
    if (courseData.teacher) {
      emitNotification('user', courseData.teacher, notificationData);
    }
  }

  /**
   * 发送作业相关通知
   * @param {string} type - 通知类型
   * @param {Object} assignmentData - 作业数据
   * @param {Object} additionalData - 额外数据
   */
  static async notifyAssignmentUpdate(type, assignmentData, additionalData = {}) {
    const notificationData = {
      type: `assignment.${type}`,
      assignment: {
        id: assignmentData._id,
        title: assignmentData.title,
        course: assignmentData.course,
        dueDate: assignmentData.dueDate
      },
      timestamp: new Date(),
      ...additionalData
    };

    // 发送实时数据同步通知
    notifications.dataSync.broadcastDataUpdate(
      'assignment',
      assignmentData._id,
      assignmentData,
      type,
      additionalData
    );

    // 通知相关班级学生
    if (assignmentData.assignedTo && assignmentData.assignedTo.length > 0) {
      for (const assignment of assignmentData.assignedTo) {
        emitNotification('class', assignment.class, notificationData);
        
        // 也可以通知特定学生
        if (assignment.students && assignment.students.length > 0) {
          for (const studentId of assignment.students) {
            emitNotification('user', studentId, notificationData);
          }
        }
      }
    }

    // 通知教师
    if (assignmentData.teacher) {
      emitNotification('user', assignmentData.teacher, notificationData);
    }
  }

  /**
   * 发送批量数据更新通知
   * @param {string} type - 数据类型
   * @param {Array} updates - 更新数组
   * @param {string} operation - 操作类型
   * @param {Object} metadata - 元数据
   */
  static async notifyBatchUpdate(type, updates, operation = 'batch_update', metadata = {}) {
    // 发送批量数据同步通知
    notifications.dataSync.broadcastBatchUpdate(type, updates, operation, metadata);

    // 发送传统通知给相关用户
    const batchNotificationData = {
      type: `${type}.${operation}`,
      count: updates.length,
      operation,
      timestamp: new Date(),
      ...metadata
    };

    // 根据类型通知相关人员
    switch (type) {
      case 'student':
        emitNotification('role', 'admin', batchNotificationData);
        emitNotification('role', 'principal', batchNotificationData);
        break;
      case 'course':
        emitNotification('role', 'director', batchNotificationData);
        break;
      case 'assignment':
        // 通知相关教师
        updates.forEach(update => {
          if (update.data.teacher) {
            emitNotification('user', update.data.teacher, batchNotificationData);
          }
        });
        break;
    }
  }

  /**
   * 发送状态变更通知
   * @param {string} type - 数据类型
   * @param {string} id - 记录ID
   * @param {string} oldStatus - 旧状态
   * @param {string} newStatus - 新状态
   * @param {Object} metadata - 元数据
   */
  static async notifyStatusChange(type, id, oldStatus, newStatus, metadata = {}) {
    // 发送实时状态变更通知
    notifications.dataSync.broadcastStatusChange(type, id, oldStatus, newStatus, metadata);

    // 发送传统通知
    const statusNotificationData = {
      type: `${type}.status_change`,
      id,
      oldStatus,
      newStatus,
      timestamp: new Date(),
      ...metadata
    };

    // 根据类型通知相关人员
    switch (type) {
      case 'student':
        if (metadata.classId) {
          emitNotification('class', metadata.classId, statusNotificationData);
        }
        break;
      case 'assignment':
        if (metadata.classIds) {
          metadata.classIds.forEach(classId => {
            emitNotification('class', classId, statusNotificationData);
          });
        }
        break;
    }
  }
}

/**
 * 数据一致性检查器
 * 检查和修复数据不一致问题
 */
class DataConsistencyChecker {
  /**
   * 检查学生-班级关联一致性
   */
  static async checkStudentClassConsistency() {
    const Student = require('../models/Student');
    const Class = require('../models/Class');
    
    const inconsistencies = [];
    
    // 检查学生记录中的班级是否存在
    const students = await Student.find({}).populate('class');
    for (const student of students) {
      if (student.class && !student.class._id) {
        inconsistencies.push({
          type: 'orphaned_student_class',
          studentId: student._id,
          classId: student.class
        });
      }
    }
    
    // 检查班级学生数量是否正确
    const classes = await Class.find({});
    for (const cls of classes) {
      const actualCount = await Student.countDocuments({ class: cls._id });
      if (cls.currentEnrollment !== actualCount) {
        inconsistencies.push({
          type: 'incorrect_enrollment_count',
          classId: cls._id,
          recorded: cls.currentEnrollment,
          actual: actualCount
        });
      }
    }
    
    return inconsistencies;
  }

  /**
   * 修复数据不一致问题
   * @param {Array} inconsistencies - 不一致问题列表
   */
  static async fixInconsistencies(inconsistencies) {
    const Student = require('../models/Student');
    const Class = require('../models/Class');
    
    for (const issue of inconsistencies) {
      try {
        switch (issue.type) {
          case 'orphaned_student_class':
            await Student.findByIdAndUpdate(issue.studentId, { $unset: { class: "" } });
            break;
            
          case 'incorrect_enrollment_count':
            await Class.findByIdAndUpdate(issue.classId, { currentEnrollment: issue.actual });
            break;
        }
      } catch (error) {
        console.error(`修复数据不一致失败 ${issue.type}:`, error);
      }
    }
  }
}

// 注册常用的同步规则
function registerCommonSyncRules() {
  // 学生创建时更新班级人数
  dataSyncManager.registerSyncRule('Student', 'create', async (student, options) => {
    if (student.class) {
      await RelationshipUpdater.updateStudentClassRelation(
        student._id, null, student.class, options.session
      );
    }
  });

  // 学生删除时清理关联数据
  dataSyncManager.registerSyncRule('Student', 'delete', async (student, options) => {
    const Grade = require('../models/Grade');
    const Submission = require('../models/Submission');
    
    // 删除相关成绩和提交记录
    await Grade.deleteMany({ student: student._id }).session(options.session);
    await Submission.deleteMany({ student: student._id }).session(options.session);
    
    // 更新班级人数
    if (student.class) {
      await RelationshipUpdater.updateStudentClassRelation(
        student._id, student.class, null, options.session
      );
    }
  });

  // 课程更新时同步班级关联
  dataSyncManager.registerSyncRule('Course', 'update', async (course, options) => {
    if (course.enrolledClasses) {
      await RelationshipUpdater.updateCourseClassRelation(
        course._id, course.enrolledClasses, options.session
      );
    }
  });
}

// 初始化同步规则
registerCommonSyncRules();

module.exports = {
  TransactionManager,
  DataSyncManager,
  RelationshipUpdater,
  RealtimeNotificationManager,
  DataConsistencyChecker,
  dataSyncManager
};