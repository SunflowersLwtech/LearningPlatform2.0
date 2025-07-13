const Course = require('../models/Course');
const Class = require('../models/Class');
const Student = require('../models/Student');

exports.createCourse = async (req, res) => {
  try {
    // 安全的课程数据提取
    const { name, subject, description, grade, semester, academicYear, schedule, credits } = req.body;
    const course = new Course({
      name,
      subject,
      description,
      grade,
      semester,
      academicYear,
      schedule,
      credits,
      teacher: req.user.id
    });
    await course.save();
    
    res.status(201).json({
      success: true,
      message: '课程创建成功',
      data: course
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '创建课程失败',
      error: error.message
    });
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const { subject, grade, semester, academicYear, teacher } = req.query;
    
    const filter = { isActive: true };
    if (subject) {filter.subject = subject;}
    if (grade) {filter.grade = grade;}
    if (semester) {filter.semester = semester;}
    if (academicYear) {filter.academicYear = academicYear;}
    if (teacher) {filter.teacher = teacher;}
    
    // 教师只能查看自己的课程（除非是管理员）
    if (req.userType === 'staff') {
      const Staff = require('../models/Staff');
      const staff = await Staff.findById(req.user.id);
      
      // 管理员、校长可以查看所有课程
      if (!['admin', 'principal', 'vice_principal'].includes(staff.role)) {
        filter.teacher = req.user.id;
      }
    } else if (req.userType === 'student') {
      // 学生只能查看自己班级的课程
      const Student = require('../models/Student');
      const student = await Student.findById(req.user.id);
      if (student && student.class) {
        filter.enrolledClasses = student.class;
      }
    }
    
    const courses = await Course.find(filter)
      .populate('teacher', 'name staffId')
      .populate('assistants', 'name staffId')
      .populate('enrolledClasses', 'name grade')
      .sort({ academicYear: -1, semester: 1, name: 1 });
    
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取课程列表失败',
      error: error.message
    });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name staffId contactInfo')
      .populate('assistants', 'name staffId')
      .populate('enrolledClasses', 'name grade currentEnrollment');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取课程信息失败',
      error: error.message
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    // 权限检查：只有课程教师或管理员可以修改
    if (req.userType === 'staff') {
      const Staff = require('../models/Staff');
      const staff = await Staff.findById(req.user.id);
      
      const isAdmin = ['admin', 'principal', 'vice_principal'].includes(staff.role);
      const isCourseTeacher = course.teacher.toString() === req.user.id;
      const isAssistant = course.assistants && course.assistants.some(
        assistant => assistant.toString() === req.user.id
      );
      
      if (!isAdmin && !isCourseTeacher && !isAssistant) {
        return res.status(403).json({
          success: false,
          message: '只能修改自己的课程或被授权的课程'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: '学生无权修改课程信息'
      });
    }
    
    // 安全的更新数据提取
    const { name, subject, description, grade, semester, academicYear, schedule, credits } = req.body;
    const updateData = {
      name,
      subject,
      description,
      grade,
      semester,
      academicYear,
      schedule,
      credits
    };
    
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: '课程信息更新成功',
      data: updatedCourse
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '更新课程信息失败',
      error: error.message
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    res.json({
      success: true,
      message: '课程删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除课程失败',
      error: error.message
    });
  }
};

exports.enrollClass = async (req, res) => {
  try {
    const { classIds } = req.body;
    const courseId = req.params.id;
    
    const course = await Course.findById(courseId).populate('enrolledClasses');
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    const validClasses = await Class.find({
      _id: { $in: classIds },
      isActive: true
    });
    
    if (validClasses.length !== classIds.length) {
      return res.status(400).json({
        success: false,
        message: '部分班级不存在或已停用'
      });
    }
    
    // 检查班级容量和学生数量
    for (const classData of validClasses) {
      if (classData.currentEnrollment >= classData.capacity) {
        return res.status(400).json({
          success: false,
          message: `班级 ${classData.name} 已满员，无法选课`
        });
      }
    }
    
    // 检查时间冲突
    const conflictCheck = await checkScheduleConflicts(course, validClasses);
    if (conflictCheck.hasConflict) {
      return res.status(400).json({
        success: false,
        message: `存在时间冲突: ${conflictCheck.message}`
      });
    }
    
    // 检查同一学期同一学科的重复选课
    const existingCourses = await Course.find({
      semester: course.semester,
      academicYear: course.academicYear,
      subject: course.subject,
      enrolledClasses: { $in: classIds },
      _id: { $ne: courseId }
    });
    
    if (existingCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `班级已选择该学期的同学科课程`
      });
    }
    
    // 添加新的班级ID，避免重复
    const newClassIds = classIds.filter(id => 
      !course.enrolledClasses.some(enrolled => enrolled._id.toString() === id.toString())
    );
    
    course.enrolledClasses = [...course.enrolledClasses, ...newClassIds];
    await course.save();
    
    res.json({
      success: true,
      message: '班级选课成功',
      data: course
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '班级选课失败',
      error: error.message
    });
  }
};

// 辅助函数：检查课程时间冲突
const checkScheduleConflicts = async (course, classes) => {
  if (!course.schedule || course.schedule.length === 0) {
    return { hasConflict: false };
  }
  
  for (const courseTime of course.schedule) {
    for (const classData of classes) {
      if (!classData.schedule) {continue;}
      
      for (const classSchedule of classData.schedule) {
        if (classSchedule.day !== courseTime.day) {continue;}
        
        // 检查时间是否重叠
        const courseStart = timeToMinutes(courseTime.startTime);
        const courseEnd = timeToMinutes(courseTime.endTime);
        
        for (const period of classSchedule.periods) {
          const periodStart = timeToMinutes(period.startTime);
          const periodEnd = timeToMinutes(period.endTime);
          
          // 检查时间重叠
          if (!(courseEnd <= periodStart || courseStart >= periodEnd)) {
            return {
              hasConflict: true,
              message: `${classData.name} 在 ${courseTime.day} ${courseTime.startTime}-${courseTime.endTime} 时间段已有安排`
            };
          }
        }
      }
    }
  }
  
  return { hasConflict: false };
};

// 辅助函数：将时间字符串转换为分钟数
const timeToMinutes = (timeStr) => {
  if (!timeStr) {return 0;}
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

exports.getCourseStudents = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('enrolledClasses');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '课程不存在'
      });
    }
    
    const classIds = course.enrolledClasses.map(cls => cls._id);
    const students = await Student.find({
      class: { $in: classIds },
      enrollmentStatus: 'enrolled'
    })
    .populate('class', 'name grade')
    .sort({ class: 1, name: 1 });
    
    res.json({
      success: true,
      data: {
        course: {
          name: course.name,
          subject: course.subject,
          grade: course.grade
        },
        enrolledClasses: course.enrolledClasses,
        students
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取课程学生列表失败',
      error: error.message
    });
  }
};