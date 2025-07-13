const Student = require('../models/Student');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const bcrypt = require('bcryptjs');
// const mongoose = require('mongoose'); // Commented out - not currently used
const { TransactionManager, RealtimeNotificationManager, dataSyncManager } = require('../utils/dataSynchronization');
const { createError, sendSuccessResponse, sendErrorResponse } = require('../utils/errorHandler');

exports.createStudent = async (req, res) => {
  try {
    const { password = req.body.studentId, ...studentData } = req.body;
    
    // 使用增强的事务管理器
    const txManager = new TransactionManager();
    await txManager.start();
    
    // 验证班级容量
    const targetClass = await Class.findById(studentData.class);
    if (!targetClass) {
      return sendErrorResponse(res, createError.badRequest('指定的班级不存在'));
    }
    
    if (targetClass.currentEnrollment >= targetClass.capacity) {
      return sendErrorResponse(res, createError.badRequest('班级已满，无法添加更多学生'));
    }
    
    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    let savedStudent;
    
    // 添加创建学生操作
    txManager.addOperation(async (session) => {
      const student = new Student({
        ...studentData,
        password: hashedPassword
      });
      savedStudent = await student.save({ session });
      return savedStudent;
    });
    
    // 添加班级人数更新操作
    txManager.addOperation(async (session) => {
      return await Class.findByIdAndUpdate(
        studentData.class,
        { 
          $inc: { currentEnrollment: 1 },
          $addToSet: { students: savedStudent._id }
        },
        { session, new: true }
      );
    });
    
    // 执行事务
    const _results = await txManager.execute(); // Prefixed with _ to indicate intentionally unused
    
    // 执行数据同步
    await dataSyncManager.executeSync('Student', 'create', savedStudent, {
      session: txManager.session,
      ignoreErrors: false
    });
    
    // 获取完整的学生信息
    const studentWithDetails = await Student.findById(savedStudent._id)
      .populate('class', 'name grade headTeacher')
      .select('-password');
    
    // 发送实时通知
    await RealtimeNotificationManager.notifyStudentUpdate('created', studentWithDetails, {
      operator: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    });
    
    sendSuccessResponse(res, studentWithDetails, '学生信息创建成功', 201);
    
  } catch (error) {
    sendErrorResponse(res, createError.internal('创建学生信息失败'));
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20, grade, class: classId, search, gender } = req.query;

    const filter = {};
    if (grade) {filter.grade = grade;}
    if (classId) {filter.class = classId;}
    if (gender && ['male', 'female'].includes(gender)) {
      filter.gender = gender;
    }
    if (search) {
      // 更严格的搜索字符串验证
      if (typeof search !== 'string') {
        return sendErrorResponse(res, createError.badRequest('搜索关键词必须是字符串'));
      }
      
      // 限制搜索字符串长度和复杂度
      if (search.length > 30) {
        return sendErrorResponse(res, createError.badRequest('搜索关键词过长（最多30字符）'));
      }
      
      // 检查是否包含潜在危险字符
      const dangerousPattern = /[\$\{\}\[\]\\`]/;
      if (dangerousPattern.test(search)) {
        return sendErrorResponse(res, createError.badRequest('搜索关键词包含非法字符'));
      }
      
      // 使用更安全的精确匹配而不是正则表达式
      const searchTerm = search.trim();
      const searchConditions = [
        { name: { $regex: `^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } },
        { studentId: { $regex: `^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } },
        { 'contactInfo.email': { $regex: `^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } }
      ];

      // 如果搜索词匹配性别或年级，添加精确匹配
      if (searchTerm.toLowerCase() === 'male' || searchTerm === '男') {
        searchConditions.push({ gender: 'male' });
      }
      if (searchTerm.toLowerCase() === 'female' || searchTerm === '女') {
        searchConditions.push({ gender: 'female' });
      }
      if (searchTerm.includes('大') || searchTerm.includes('年级')) {
        searchConditions.push({ grade: { $regex: searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
      }

      filter.$or = searchConditions;
    }
    
    const students = await Student.find(filter)
      .populate('class', 'name grade')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Student.countDocuments(filter);
    
    res.json({
      success: true,
      data: students,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取学生列表失败',
      error: error.message
    });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('class', 'name grade headTeacher')
      .populate('statusHistory.operator', 'name');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        student: student
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取学生信息失败',
      error: error.message
    });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const updates = req.body;
    
    // 获取原始学生信息
    const originalStudent = await Student.findById(studentId).populate('class');
    if (!originalStudent) {
      return sendErrorResponse(res, createError.notFound('学生不存在'));
    }
    
    // 检查是否更换班级
    const isClassChange = updates.class && updates.class !== originalStudent.class?._id?.toString();
    
    if (isClassChange) {
      // 使用事务处理班级更换
      const txManager = new TransactionManager();
      await txManager.start();
      
      // 验证新班级
      const newClass = await Class.findById(updates.class);
      if (!newClass) {
        return sendErrorResponse(res, createError.badRequest('新班级不存在'));
      }
      
      if (newClass.currentEnrollment >= newClass.capacity) {
        return sendErrorResponse(res, createError.badRequest('新班级已满'));
      }
      
      let updatedStudent;
      
      // 更新学生信息
      txManager.addOperation(async (session) => {
        updatedStudent = await Student.findByIdAndUpdate(
          studentId,
          updates,
          { new: true, runValidators: true, session }
        );
        return updatedStudent;
      });
      
      // 更新班级关联
      txManager.addOperation(async (session) => {
        // 从原班级移除
        if (originalStudent.class) {
          await Class.findByIdAndUpdate(
            originalStudent.class._id,
            { 
              $pull: { students: studentId },
              $inc: { currentEnrollment: -1 }
            },
            { session }
          );
        }
        
        // 添加到新班级
        await Class.findByIdAndUpdate(
          updates.class,
          { 
            $addToSet: { students: studentId },
            $inc: { currentEnrollment: 1 }
          },
          { session }
        );
      });
      
      await txManager.execute();
      
      // 发送班级变更通知
      await RealtimeNotificationManager.notifyStudentUpdate('class_changed', updatedStudent, {
        oldClass: originalStudent.class,
        newClass: newClass,
        operator: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role
        }
      });
      
    } else {
      // 普通更新（不涉及班级变更）
      const updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        updates,
        { new: true, runValidators: true }
      ).populate('class', 'name grade headTeacher');
      
      // 发送更新通知
      await RealtimeNotificationManager.notifyStudentUpdate('updated', updatedStudent, {
        changes: Object.keys(updates),
        operator: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role
        }
      });
    }
    
    // 获取最新的学生信息
    const finalStudent = await Student.findById(studentId)
      .populate('class', 'name grade headTeacher')
      .select('-password');
    
    sendSuccessResponse(res, finalStudent, '学生信息更新成功');
    
  } catch (error) {
    sendErrorResponse(res, createError.internal('更新学生信息失败'));
  }
};

exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const operatorId = req.user.id;
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }
    
    student.statusHistory.push({
      status: student.enrollmentStatus,
      date: new Date(),
      reason,
      operator: operatorId
    });
    
    student.enrollmentStatus = status;
    await student.save();
    
    res.json({
      success: true,
      message: '学籍状态更新成功',
      data: student
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新学籍状态失败',
      error: error.message
    });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // 获取学生信息用于通知和清理
    const student = await Student.findById(studentId).populate('class', 'name grade');
    if (!student) {
      return sendErrorResponse(res, createError.notFound('学生不存在'));
    }
    
    // 使用增强的事务管理器
    const txManager = new TransactionManager();
    await txManager.start();
    
    // 删除学生记录
    txManager.addOperation(async (session) => {
      return await Student.findByIdAndDelete(studentId).session(session);
    });
    
    // 更新班级人数
    if (student.class) {
      txManager.addOperation(async (session) => {
        return await Class.findByIdAndUpdate(
          student.class._id,
          { 
            $pull: { students: studentId },
            $inc: { currentEnrollment: -1 }
          },
          { session }
        );
      });
    }
    
    // 删除关联的成绩记录
    txManager.addOperation(async (session) => {
      return await Grade.deleteMany({ student: studentId }).session(session);
    });
    
    // 删除关联的作业提交记录
    txManager.addOperation(async (session) => {
      const Submission = require('../models/Submission');
      return await Submission.deleteMany({ student: studentId }).session(session);
    });
    
    // 添加文件清理回滚操作
    txManager.addOperation(
      async (session) => {
        // 这里可以添加文件清理逻辑
        return { message: 'Files marked for cleanup' };
      },
      async () => {
        // 回滚时的文件恢复逻辑（如果需要）
        console.log('文件清理回滚');
      }
    );
    
    // 执行事务
    await txManager.execute();
    
    // 执行数据同步
    await dataSyncManager.executeSync('Student', 'delete', student, {
      ignoreErrors: true // 删除操作时忽略同步错误
    });
    
    // 发送删除通知
    await RealtimeNotificationManager.notifyStudentUpdate('deleted', student, {
      operator: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      },
      deletedData: {
        studentId: student.studentId,
        name: student.name,
        class: student.class
      }
    });
    
    sendSuccessResponse(res, { 
      deletedStudent: {
        id: student._id,
        name: student.name,
        studentId: student.studentId
      }
    }, '学生信息删除成功');
    
  } catch (error) {
    sendErrorResponse(res, createError.internal('删除学生信息失败'));
  }
};

exports.getStudentGPA = async (req, res) => {
  try {
    const { id } = req.params;
    const { academicYear, semester } = req.query;
    
    // 权限检查：学生只能查看自己的GPA
    if (req.userType === 'student' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: '只能查看自己的GPA'
      });
    }
    
    const student = await Student.findById(id).populate('class', 'name grade');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }
    
    // 计算当前学期/学年的GPA
    const currentGPA = await Grade.calculateStudentGPA(id, academicYear, semester);
    
    // 计算累计GPA（所有学期）
    const cumulativeGPA = await Grade.calculateStudentGPA(id);
    
    // 获取详细成绩信息
    const filter = { student: id };
    if (academicYear) {filter.academicYear = academicYear;}
    if (semester) {filter.semester = semester;}
    
    const grades = await Grade.find(filter)
      .populate('course', 'name subject credits')
      .sort({ academicYear: -1, semester: 1, gradedAt: -1 });
    
    // 按学期分组
    const gradesByTerm = {};
    grades.forEach(grade => {
      const termKey = `${grade.academicYear}-${grade.semester}`;
      if (!gradesByTerm[termKey]) {
        gradesByTerm[termKey] = {
          academicYear: grade.academicYear,
          semester: grade.semester,
          grades: [],
          termGPA: 0,
          totalCredits: 0
        };
      }
      gradesByTerm[termKey].grades.push(grade);
    });
    
    // 计算每学期的GPA
    for (const termKey in gradesByTerm) {
      const term = gradesByTerm[termKey];
      const termGPAResult = await Grade.calculateStudentGPA(
        id, 
        term.academicYear, 
        term.semester
      );
      term.termGPA = termGPAResult.gpa;
      term.totalCredits = termGPAResult.totalCredits;
    }
    
    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          studentId: student.studentId,
          class: student.class
        },
        currentGPA: currentGPA.gpa,
        currentCredits: currentGPA.totalCredits,
        cumulativeGPA: cumulativeGPA.gpa,
        totalCredits: cumulativeGPA.totalCredits,
        gradesByTerm: Object.values(gradesByTerm).sort((a, b) => {
          if (a.academicYear !== b.academicYear) {
            return b.academicYear.localeCompare(a.academicYear);
          }
          const semesterOrder = { 'fall': 3, 'spring': 2, 'summer': 1 };
          return (semesterOrder[b.semester] || 0) - (semesterOrder[a.semester] || 0);
        })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取GPA信息失败',
      error: error.message
    });
  }
};

exports.getClassGPARanking = async (req, res) => {
  try {
    const { classId } = req.params;
    const { academicYear, semester, limit = 50 } = req.query;
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    const students = await Student.find({ 
      class: classId,
      enrollmentStatus: 'enrolled'
    }).select('name studentId');
    
    const gpaRanking = [];
    
    for (const student of students) {
      const gpaResult = await Grade.calculateStudentGPA(
        student._id, 
        academicYear, 
        semester
      );
      
      gpaRanking.push({
        student: {
          id: student._id,
          name: student.name,
          studentId: student.studentId
        },
        gpa: gpaResult.gpa,
        totalCredits: gpaResult.totalCredits
      });
    }
    
    // 按GPA降序排序
    gpaRanking.sort((a, b) => b.gpa - a.gpa);
    
    // 添加排名
    gpaRanking.forEach((item, index) => {
      item.rank = index + 1;
    });
    
    res.json({
      success: true,
      data: {
        class: {
          id: classData._id,
          name: classData.name,
          grade: classData.grade
        },
        period: { academicYear, semester },
        ranking: gpaRanking.slice(0, parseInt(limit, 10)),
        stats: {
          totalStudents: gpaRanking.length,
          averageGPA: gpaRanking.length > 0 
            ? Math.round((gpaRanking.reduce((sum, item) => sum + item.gpa, 0) / gpaRanking.length) * 100) / 100
            : 0,
          highestGPA: gpaRanking.length > 0 ? gpaRanking[0].gpa : 0,
          lowestGPA: gpaRanking.length > 0 ? gpaRanking[gpaRanking.length - 1].gpa : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取班级GPA排名失败',
      error: error.message
    });
  }
};

// 获取当前学生信息
exports.getCurrentStudent = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findById(studentId)
      .populate('class', 'name grade capacity currentEnrollment')
      .select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '学生信息不存在'
      });
    }

    // 简化统计信息，避免复杂查询
    const stats = {
      enrollmentStatus: student.enrollmentStatus,
      grade: student.grade,
      className: student.class ? student.class.name : '未分配班级'
    };

    res.json({
      success: true,
      message: '获取学生信息成功',
      data: {
        ...student.toObject(),
        stats
      }
    });
  } catch (error) {
    console.error('获取当前学生信息失败:', error);
    res.status(400).json({
      success: false,
      message: '获取学生信息失败',
      error: error.message
    });
  }
};