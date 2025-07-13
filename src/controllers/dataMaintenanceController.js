const { DataConsistencyChecker, TransactionManager } = require('../utils/dataSynchronization');
const { createError, sendSuccessResponse, sendErrorResponse } = require('../utils/errorHandler');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Course = require('../models/Course');
const Grade = require('../models/Grade');
const Assignment = require('../models/Assignment');

/**
 * 数据一致性检查和维护控制器
 * 提供数据完整性检查和修复功能
 */

/**
 * 全面的数据一致性检查
 */
exports.checkDataConsistency = async (req, res) => {
  try {
    const checkResults = {
      timestamp: new Date(),
      checks: {},
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        warningIssues: 0
      }
    };

    // 1. 学生-班级关联一致性检查
    console.log('检查学生-班级关联一致性...');
    const studentClassIssues = await DataConsistencyChecker.checkStudentClassConsistency();
    checkResults.checks.studentClass = {
      description: '学生-班级关联一致性',
      issues: studentClassIssues,
      count: studentClassIssues.length,
      severity: studentClassIssues.length > 0 ? 'critical' : 'ok'
    };

    // 2. 课程-班级关联检查
    console.log('检查课程-班级关联一致性...');
    const courseClassIssues = await checkCourseClassConsistency();
    checkResults.checks.courseClass = {
      description: '课程-班级关联一致性',
      issues: courseClassIssues,
      count: courseClassIssues.length,
      severity: courseClassIssues.length > 0 ? 'warning' : 'ok'
    };

    // 3. 孤立记录检查
    console.log('检查孤立记录...');
    const orphanedRecords = await checkOrphanedRecords();
    checkResults.checks.orphanedRecords = {
      description: '孤立记录检查',
      issues: orphanedRecords,
      count: orphanedRecords.length,
      severity: orphanedRecords.length > 0 ? 'critical' : 'ok'
    };

    // 4. 数据引用完整性检查
    console.log('检查数据引用完整性...');
    const referenceIssues = await checkReferenceIntegrity();
    checkResults.checks.referenceIntegrity = {
      description: '数据引用完整性',
      issues: referenceIssues,
      count: referenceIssues.length,
      severity: referenceIssues.length > 0 ? 'critical' : 'ok'
    };

    // 5. 计算字段一致性检查
    console.log('检查计算字段一致性...');
    const calculatedFieldIssues = await checkCalculatedFields();
    checkResults.checks.calculatedFields = {
      description: '计算字段一致性',
      issues: calculatedFieldIssues,
      count: calculatedFieldIssues.length,
      severity: calculatedFieldIssues.length > 0 ? 'warning' : 'ok'
    };

    // 统计问题
    Object.values(checkResults.checks).forEach(check => {
      checkResults.summary.totalIssues += check.count;
      if (check.severity === 'critical') {
        checkResults.summary.criticalIssues += check.count;
      } else if (check.severity === 'warning') {
        checkResults.summary.warningIssues += check.count;
      }
    });

    sendSuccessResponse(res, checkResults, '数据一致性检查完成');

  } catch (error) {
    console.error('数据一致性检查失败:', error);
    sendErrorResponse(res, createError.internal('数据一致性检查失败'));
  }
};

/**
 * 修复数据不一致问题
 */
exports.fixDataInconsistencies = async (req, res) => {
  try {
    const { checkTypes, autoFix = false } = req.body;
    
    if (!Array.isArray(checkTypes) || checkTypes.length === 0) {
      return sendErrorResponse(res, createError.badRequest('请指定要修复的检查类型'));
    }

    const fixResults = {
      timestamp: new Date(),
      fixes: {},
      summary: {
        totalFixed: 0,
        totalFailed: 0
      }
    };

    // 使用事务确保修复操作的原子性
    const txManager = new TransactionManager();
    await txManager.start();

    try {
      for (const checkType of checkTypes) {
        console.log(`修复 ${checkType} 类型的问题...`);
        
        switch (checkType) {
          case 'studentClass':
            const studentClassResult = await fixStudentClassIssues(txManager.session, autoFix);
            fixResults.fixes.studentClass = studentClassResult;
            break;
            
          case 'courseClass':
            const courseClassResult = await fixCourseClassIssues(txManager.session, autoFix);
            fixResults.fixes.courseClass = courseClassResult;
            break;
            
          case 'orphanedRecords':
            const orphanedResult = await fixOrphanedRecords(txManager.session, autoFix);
            fixResults.fixes.orphanedRecords = orphanedResult;
            break;
            
          case 'referenceIntegrity':
            const referenceResult = await fixReferenceIntegrity(txManager.session, autoFix);
            fixResults.fixes.referenceIntegrity = referenceResult;
            break;
            
          case 'calculatedFields':
            const calculatedResult = await fixCalculatedFields(txManager.session, autoFix);
            fixResults.fixes.calculatedFields = calculatedResult;
            break;
            
          default:
            console.warn(`未知的检查类型: ${checkType}`);
        }
      }

      // 统计修复结果
      Object.values(fixResults.fixes).forEach(fix => {
        fixResults.summary.totalFixed += fix.fixed || 0;
        fixResults.summary.totalFailed += fix.failed || 0;
      });

      await txManager.execute();
      
      sendSuccessResponse(res, fixResults, '数据修复完成');

    } catch (error) {
      await txManager.cancel();
      throw error;
    }

  } catch (error) {
    console.error('数据修复失败:', error);
    sendErrorResponse(res, createError.internal('数据修复失败'));
  }
};

/**
 * 获取数据统计信息
 */
exports.getDataStatistics = async (req, res) => {
  try {
    const stats = {
      timestamp: new Date(),
      collections: {},
      relationships: {},
      integrity: {}
    };

    // 基础统计
    stats.collections.students = await Student.countDocuments();
    stats.collections.classes = await Class.countDocuments();
    stats.collections.courses = await Course.countDocuments();
    stats.collections.grades = await Grade.countDocuments();
    stats.collections.assignments = await Assignment.countDocuments();

    // 关系统计
    stats.relationships.studentsWithClass = await Student.countDocuments({ class: { $exists: true } });
    stats.relationships.studentsWithoutClass = await Student.countDocuments({ class: { $exists: false } });
    stats.relationships.classesWithStudents = await Class.countDocuments({ currentEnrollment: { $gt: 0 } });
    stats.relationships.emptyClasses = await Class.countDocuments({ currentEnrollment: 0 });

    // 完整性统计
    const totalStudents = stats.collections.students;
    const studentsWithValidClass = await Student.aggregate([
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $match: {
          'classInfo.0': { $exists: true }
        }
      },
      {
        $count: 'count'
      }
    ]);

    stats.integrity.studentClassIntegrity = totalStudents > 0 
      ? Math.round((studentsWithValidClass[0]?.count || 0) / totalStudents * 100)
      : 100;

    // 数据库大小估算（近似）
    stats.databaseInfo = {
      estimatedSize: 'N/A', // 需要数据库管理员权限
      lastBackup: 'N/A',
      indexCount: 'N/A'
    };

    sendSuccessResponse(res, stats, '数据统计信息获取成功');

  } catch (error) {
    console.error('获取数据统计失败:', error);
    sendErrorResponse(res, createError.internal('获取数据统计失败'));
  }
};

/**
 * 重建索引
 */
exports.rebuildIndexes = async (req, res) => {
  try {
    const { collections = ['all'] } = req.body;
    
    const indexResults = {
      timestamp: new Date(),
      results: {}
    };

    const modelsToReindex = [];
    
    if (collections.includes('all') || collections.includes('students')) {
      modelsToReindex.push({ name: 'Student', model: Student });
    }
    if (collections.includes('all') || collections.includes('classes')) {
      modelsToReindex.push({ name: 'Class', model: Class });
    }
    if (collections.includes('all') || collections.includes('courses')) {
      modelsToReindex.push({ name: 'Course', model: Course });
    }
    if (collections.includes('all') || collections.includes('grades')) {
      modelsToReindex.push({ name: 'Grade', model: Grade });
    }

    for (const { name, model } of modelsToReindex) {
      try {
        console.log(`重建 ${name} 集合索引...`);
        await model.collection.dropIndexes();
        await model.ensureIndexes();
        
        indexResults.results[name] = {
          status: 'success',
          message: '索引重建成功'
        };
      } catch (error) {
        console.error(`重建 ${name} 索引失败:`, error);
        indexResults.results[name] = {
          status: 'error',
          message: error.message
        };
      }
    }

    sendSuccessResponse(res, indexResults, '索引重建完成');

  } catch (error) {
    console.error('重建索引失败:', error);
    sendErrorResponse(res, createError.internal('重建索引失败'));
  }
};

// 辅助函数

/**
 * 检查课程-班级关联一致性
 */
async function checkCourseClassConsistency() {
  const issues = [];
  
  // 检查课程中引用的班级是否存在
  const courses = await Course.find({}).populate('enrolledClasses');
  
  for (const course of courses) {
    if (course.enrolledClasses) {
      for (const classId of course.enrolledClasses) {
        if (!classId) {
          issues.push({
            type: 'invalid_class_reference',
            courseId: course._id,
            courseName: course.name,
            invalidClassId: classId
          });
        }
      }
    }
  }
  
  return issues;
}

/**
 * 检查孤立记录
 */
async function checkOrphanedRecords() {
  const issues = [];
  
  // 检查没有有效班级引用的学生
  const studentsWithInvalidClass = await Student.aggregate([
    {
      $lookup: {
        from: 'classes',
        localField: 'class',
        foreignField: '_id',
        as: 'classInfo'
      }
    },
    {
      $match: {
        class: { $exists: true },
        'classInfo.0': { $exists: false }
      }
    }
  ]);
  
  studentsWithInvalidClass.forEach(student => {
    issues.push({
      type: 'orphaned_student',
      studentId: student._id,
      studentName: student.name,
      invalidClassId: student.class
    });
  });
  
  return issues;
}

/**
 * 检查数据引用完整性
 */
async function checkReferenceIntegrity() {
  const issues = [];
  
  // 检查成绩记录的学生和课程引用
  const gradesWithIssues = await Grade.aggregate([
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseInfo'
      }
    },
    {
      $match: {
        $or: [
          { 'studentInfo.0': { $exists: false } },
          { 'courseInfo.0': { $exists: false } }
        ]
      }
    }
  ]);
  
  gradesWithIssues.forEach(grade => {
    if (!grade.studentInfo || grade.studentInfo.length === 0) {
      issues.push({
        type: 'invalid_student_reference_in_grade',
        gradeId: grade._id,
        studentId: grade.student
      });
    }
    
    if (!grade.courseInfo || grade.courseInfo.length === 0) {
      issues.push({
        type: 'invalid_course_reference_in_grade',
        gradeId: grade._id,
        courseId: grade.course
      });
    }
  });
  
  return issues;
}

/**
 * 检查计算字段一致性
 */
async function checkCalculatedFields() {
  const issues = [];
  
  // 检查班级人数统计
  const classes = await Class.find({});
  
  for (const cls of classes) {
    const actualCount = await Student.countDocuments({ class: cls._id });
    if (cls.currentEnrollment !== actualCount) {
      issues.push({
        type: 'incorrect_enrollment_count',
        classId: cls._id,
        className: cls.name,
        recorded: cls.currentEnrollment,
        actual: actualCount,
        difference: actualCount - cls.currentEnrollment
      });
    }
  }
  
  return issues;
}

// 修复函数
async function fixStudentClassIssues(session, autoFix) {
  const issues = await DataConsistencyChecker.checkStudentClassConsistency();
  let fixed = 0;
  const failed = 0;
  
  if (autoFix) {
    await DataConsistencyChecker.fixInconsistencies(issues);
    fixed = issues.length;
  }
  
  return { total: issues.length, fixed, failed, issues };
}

async function fixCourseClassIssues(session, autoFix) {
  // 实现课程班级修复逻辑
  return { total: 0, fixed: 0, failed: 0, issues: [] };
}

async function fixOrphanedRecords(session, autoFix) {
  // 实现孤立记录修复逻辑
  return { total: 0, fixed: 0, failed: 0, issues: [] };
}

async function fixReferenceIntegrity(session, autoFix) {
  // 实现引用完整性修复逻辑
  return { total: 0, fixed: 0, failed: 0, issues: [] };
}

async function fixCalculatedFields(session, autoFix) {
  const issues = await checkCalculatedFields();
  let fixed = 0;
  let failed = 0;
  
  if (autoFix) {
    for (const issue of issues) {
      try {
        if (issue.type === 'incorrect_enrollment_count') {
          await Class.findByIdAndUpdate(
            issue.classId,
            { currentEnrollment: issue.actual },
            { session }
          );
          fixed++;
        }
      } catch (error) {
        console.error(`修复计算字段失败:`, error);
        failed++;
      }
    }
  }
  
  return { total: issues.length, fixed, failed, issues };
}

module.exports = {
  checkDataConsistency: exports.checkDataConsistency,
  fixDataInconsistencies: exports.fixDataInconsistencies,
  getDataStatistics: exports.getDataStatistics,
  rebuildIndexes: exports.rebuildIndexes
};