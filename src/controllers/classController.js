const Class = require('../models/Class');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const mongoose = require('mongoose');

exports.createClass = async (req, res) => {
  try {
    const newClass = new Class(req.body);
    await newClass.save();
    
    res.status(201).json({
      success: true,
      message: '班级创建成功',
      data: newClass
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '创建班级失败',
      error: error.message
    });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const { grade, academicYear, classType } = req.query;
    
    const filter = { isActive: true };
    if (grade) {filter.grade = grade;}
    if (academicYear) {filter.academicYear = academicYear;}
    if (classType) {filter.classType = classType;}
    
    const classes = await Class.find(filter)
      .populate('headTeacher', 'name staffId')
      .populate('subjectTeachers.teacher', 'name staffId')
      .sort({ grade: 1, name: 1 });
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取班级列表失败',
      error: error.message
    });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('headTeacher', 'name staffId contactInfo')
      .populate('subjectTeachers.teacher', 'name staffId subjects');
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    const students = await Student.find({ class: req.params.id })
      .select('studentId name gender enrollmentStatus')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: {
        class: {
          ...classData.toObject(),
          students
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取班级信息失败',
      error: error.message
    });
  }
};

exports.getClassStudents = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    const students = await Student.find({ class: req.params.id })
      .select('studentId name gender enrollmentStatus dateOfBirth phone email')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取班级学生失败',
      error: error.message
    });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    res.json({
      success: true,
      message: '班级信息更新成功',
      data: updatedClass
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新班级信息失败',
      error: error.message
    });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;
    
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { schedule },
      { new: true, runValidators: true }
    ).populate('schedule.periods.teacher', 'name staffId');
    
    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    res.json({
      success: true,
      message: '课表更新成功',
      data: updatedClass
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新课表失败',
      error: error.message
    });
  }
};

exports.assignTeacher = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { teacherId, subject, role } = req.body;
    const classId = req.params.id;
    
    // 验证必需字段
    if (!teacherId || !role) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '教师ID和角色为必需字段'
      });
    }
    
    if (role === 'subject_teacher' && !subject) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '学科教师必须指定学科'
      });
    }
    
    const teacher = await Staff.findById(teacherId).session(session);
    if (!teacher) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '教师不存在'
      });
    }
    
    // 验证教师角色
    const validTeacherRoles = ['teacher', 'head_teacher', 'director', 'principal', 'vice_principal'];
    if (!validTeacherRoles.includes(teacher.role)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '该员工不是教师，无法分配给班级'
      });
    }
    
    const classData = await Class.findById(classId).session(session);
    if (!classData) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    // 处理班主任分配
    if (role === 'head_teacher') {
      // 如果之前有班主任，移除其关联
      if (classData.headTeacher && classData.headTeacher.toString() !== teacherId) {
        const previousHeadTeacher = await Staff.findById(classData.headTeacher).session(session);
        if (previousHeadTeacher) {
          previousHeadTeacher.classes = previousHeadTeacher.classes.filter(
            cls => cls.toString() !== classId
          );
          await previousHeadTeacher.save({ session });
        }
      }
      
      classData.headTeacher = teacherId;
    } else if (role === 'subject_teacher') {
      const existingIndex = classData.subjectTeachers.findIndex(
        st => st.subject === subject
      );
      
      if (existingIndex > -1) {
        // 移除之前的学科教师关联
        const previousTeacherId = classData.subjectTeachers[existingIndex].teacher;
        if (previousTeacherId && previousTeacherId.toString() !== teacherId) {
          const previousTeacher = await Staff.findById(previousTeacherId).session(session);
          if (previousTeacher) {
            previousTeacher.classes = previousTeacher.classes.filter(
              cls => cls.toString() !== classId
            );
            await previousTeacher.save({ session });
          }
        }
        
        classData.subjectTeachers[existingIndex].teacher = teacherId;
      } else {
        classData.subjectTeachers.push({
          teacher: teacherId,
          subject
        });
      }
    }
    
    await classData.save({ session });
    
    // 确保教师的班级列表包含该班级
    if (!teacher.classes.includes(classId)) {
      teacher.classes.push(classId);
      await teacher.save({ session });
    }
    
    await session.commitTransaction();
    
    const updatedClassData = await Class.findById(classId)
      .populate('headTeacher', 'name staffId')
      .populate('subjectTeachers.teacher', 'name staffId');
    
    res.json({
      success: true,
      message: '教师分配成功',
      data: updatedClassData
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      message: '分配教师失败',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

exports.getClassSchedule = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('schedule.periods.teacher', 'name staffId')
      .select('schedule name grade');
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    res.json({
      success: true,
      data: classData.schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取课表失败',
      error: error.message
    });
  }
};