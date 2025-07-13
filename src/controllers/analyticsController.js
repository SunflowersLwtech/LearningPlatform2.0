const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Analytics = require('../models/Analytics');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Course = require('../models/Course');

exports.generateStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, academicYear, semester } = req.query;
    
    const student = await Student.findById(studentId).populate('class');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    
    const grades = await Grade.find({
      student: studentId,
      academicYear: academicYear || new Date().getFullYear().toString(),
      ...(semester && { semester }),
      ...dateFilter
    }).populate('course', 'name subject');
    
    const attendance = await Attendance.find({
      student: studentId,
      ...dateFilter
    });
    
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => ['absent', 'sick_leave', 'personal_leave'].includes(a.status)).length;
    const tardyDays = attendance.filter(a => a.status === 'late').length;
    
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    
    const subjectGrades = {};
    grades.forEach(grade => {
      const subject = grade.course.subject;
      if (!subjectGrades[subject]) {
        subjectGrades[subject] = [];
      }
      subjectGrades[subject].push(grade);
    });
    
    // 使用加权平均计算学科成绩
    const calculateWeightedAverage = (gradeList) => {
      if (gradeList.length === 0) {return 0;}
      
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      gradeList.forEach(grade => {
        const weight = grade.weight || 1;
        totalWeightedScore += grade.percentage * weight;
        totalWeight += weight;
      });
      
      return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    };
    
    const subjectPerformance = Object.keys(subjectGrades).map(subject => {
      const subjectScores = subjectGrades[subject];
      const averageScore = calculateWeightedAverage(subjectScores);
      
      return {
        subject,
        averageScore: Math.round(averageScore * 100) / 100,
        gradesCount: subjectScores.length,
        latestGrade: subjectScores[subjectScores.length - 1]
      };
    });
    
    const overallAverage = calculateWeightedAverage(grades);
    
    const gradeDistribution = {
      A: grades.filter(g => g.percentage >= 90).length,
      B: grades.filter(g => g.percentage >= 80 && g.percentage < 90).length,
      C: grades.filter(g => g.percentage >= 70 && g.percentage < 80).length,
      D: grades.filter(g => g.percentage >= 60 && g.percentage < 70).length,
      F: grades.filter(g => g.percentage < 60).length
    };
    
    const report = {
      student: {
        name: student.name,
        studentId: student.studentId,
        class: student.class.name,
        grade: student.grade
      },
      period: {
        startDate,
        endDate,
        academicYear,
        semester
      },
      attendance: {
        totalDays,
        presentDays,
        absentDays,
        tardyDays,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      },
      academic: {
        overallAverage: Math.round(overallAverage * 100) / 100,
        gradeDistribution,
        subjectPerformance,
        totalGrades: grades.length
      },
      insights: []
    };
    
    if (attendanceRate < 85) {
      report.insights.push({
        category: 'attendance',
        message: '出勤率偏低，需要关注',
        priority: 'high',
        recommendations: ['与家长沟通', '了解缺勤原因', '制定改善计划']
      });
    }
    
    if (overallAverage < 70) {
      report.insights.push({
        category: 'academic',
        message: '学业成绩需要提升',
        priority: 'high',
        recommendations: ['安排额外辅导', '分析薄弱学科', '制定学习计划']
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成学生报告失败',
      error: error.message
    });
  }
};

exports.generateClassReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const { academicYear, semester } = req.query;
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: '班级不存在'
      });
    }
    
    const students = await Student.find({ class: classId });
    const studentIds = students.map(s => s._id);
    
    const grades = await Grade.find({
      student: { $in: studentIds },
      academicYear: academicYear || new Date().getFullYear().toString(),
      ...(semester && { semester })
    }).populate('course', 'name subject');
    
    const attendance = await Attendance.find({
      student: { $in: studentIds },
      class: classId
    });
    
    // 实现加权平均计算
    const calculateWeightedAverage = (gradeList) => {
      if (gradeList.length === 0) {return 0;}
      
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      gradeList.forEach(grade => {
        const weight = grade.weight || 1;
        totalWeightedScore += grade.percentage * weight;
        totalWeight += weight;
      });
      
      return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    };
    
    const classAverage = calculateWeightedAverage(grades);
    
    const subjectAverages = {};
    grades.forEach(grade => {
      const subject = grade.course.subject;
      if (!subjectAverages[subject]) {
        subjectAverages[subject] = [];
      }
      subjectAverages[subject].push(grade.percentage);
    });
    
    const subjectPerformance = Object.keys(subjectAverages).map(subject => {
      const scores = subjectAverages[subject];
      
      // 根据成绩类型计算加权平均
      const subjectGrades = grades.filter(g => g.course.subject === subject);
      const weightedAverage = calculateWeightedAverage(subjectGrades);
      
      return {
        subject,
        average: Math.round(weightedAverage * 100) / 100,
        studentsCount: scores.length,
        passRate: Math.round((scores.filter(score => score >= 60).length / scores.length) * 100 * 100) / 100
      };
    });
    
    const totalAttendanceDays = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const classAttendanceRate = totalAttendanceDays > 0 
      ? (presentCount / totalAttendanceDays) * 100 
      : 0;
    
    const gradeDistribution = {
      A: grades.filter(g => g.percentage >= 90).length,
      B: grades.filter(g => g.percentage >= 80 && g.percentage < 90).length,
      C: grades.filter(g => g.percentage >= 70 && g.percentage < 80).length,
      D: grades.filter(g => g.percentage >= 60 && g.percentage < 70).length,
      F: grades.filter(g => g.percentage < 60).length
    };
    
    const report = {
      class: {
        name: classData.name,
        grade: classData.grade,
        studentsCount: students.length,
        headTeacher: classData.headTeacher
      },
      period: {
        academicYear,
        semester
      },
      academic: {
        classAverage: Math.round(classAverage * 100) / 100,
        subjectPerformance,
        gradeDistribution,
        passRate: grades.length > 0 
          ? (grades.filter(g => g.percentage >= 60).length / grades.length) * 100 
          : 0
      },
      attendance: {
        classAttendanceRate: Math.round(classAttendanceRate * 100) / 100,
        totalRecords: totalAttendanceDays
      }
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成班级报告失败',
      error: error.message
    });
  }
};

exports.getGradeDistribution = async (req, res) => {
  try {
    const { course, class: classId, academicYear, semester } = req.query;
    
    const filter = {
      academicYear: academicYear || new Date().getFullYear().toString()
    };
    
    if (course) {filter.course = course;}
    if (semester) {filter.semester = semester;}
    
    if (classId) {
      const students = await Student.find({ class: classId });
      filter.student = { $in: students.map(s => s._id) };
    }
    
    const grades = await Grade.find(filter);
    
    const distribution = {
      A: { count: 0, percentage: 0 },
      B: { count: 0, percentage: 0 },
      C: { count: 0, percentage: 0 },
      D: { count: 0, percentage: 0 },
      F: { count: 0, percentage: 0 }
    };
    
    grades.forEach(grade => {
      if (grade.percentage >= 90) {distribution.A.count++;}
      else if (grade.percentage >= 80) {distribution.B.count++;}
      else if (grade.percentage >= 70) {distribution.C.count++;}
      else if (grade.percentage >= 60) {distribution.D.count++;}
      else {distribution.F.count++;}
    });
    
    const total = grades.length;
    if (total > 0) {
      Object.keys(distribution).forEach(key => {
        distribution[key].percentage = Math.round((distribution[key].count / total) * 100 * 100) / 100;
      });
    }
    
    res.json({
      success: true,
      data: {
        distribution,
        total,
        average: total > 0 
          ? Math.round((grades.reduce((sum, grade) => sum + grade.percentage, 0) / total) * 100) / 100 
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取成绩分布失败',
      error: error.message
    });
  }
};

exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const { class: classId, startDate, endDate } = req.query;
    
    const filter = {};
    if (classId) {filter.class = classId;}
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const attendanceRecords = await Attendance.find(filter)
      .populate('student', 'name studentId')
      .populate('class', 'name grade');
    
    const summary = {
      totalRecords: attendanceRecords.length,
      statusBreakdown: {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        sick_leave: 0,
        personal_leave: 0
      },
      dailyStats: {},
      studentStats: {}
    };
    
    attendanceRecords.forEach(record => {
      summary.statusBreakdown[record.status]++;
      
      const dateKey = record.date.toISOString().split('T')[0];
      if (!summary.dailyStats[dateKey]) {
        summary.dailyStats[dateKey] = {
          total: 0,
          present: 0,
          absent: 0,
          rate: 0
        };
      }
      summary.dailyStats[dateKey].total++;
      if (record.status === 'present') {
        summary.dailyStats[dateKey].present++;
      } else {
        summary.dailyStats[dateKey].absent++;
      }
      
      const studentId = record.student._id.toString();
      if (!summary.studentStats[studentId]) {
        summary.studentStats[studentId] = {
          student: record.student,
          total: 0,
          present: 0,
          rate: 0
        };
      }
      summary.studentStats[studentId].total++;
      if (record.status === 'present') {
        summary.studentStats[studentId].present++;
      }
    });
    
    Object.keys(summary.dailyStats).forEach(date => {
      const stats = summary.dailyStats[date];
      stats.rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100 * 100) / 100 : 0;
    });
    
    Object.keys(summary.studentStats).forEach(studentId => {
      const stats = summary.studentStats[studentId];
      stats.rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100 * 100) / 100 : 0;
    });
    
    const overallRate = summary.totalRecords > 0 
      ? Math.round((summary.statusBreakdown.present / summary.totalRecords) * 100 * 100) / 100 
      : 0;
    
    res.json({
      success: true,
      data: {
        ...summary,
        overallAttendanceRate: overallRate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取考勤分析失败',
      error: error.message
    });
  }
};

// 学生统计
exports.getStudentStats = async (req, res) => {
  try {
    const Student = require('../models/Student');
    const Class = require('../models/Class');
    
    const totalStudents = await Student.countDocuments({ isActive: true });
    const maleStudents = await Student.countDocuments({ gender: 'male', isActive: true });
    const femaleStudents = await Student.countDocuments({ gender: 'female', isActive: true });
    
    const gradeStats = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalStudents,
        male: maleStudents,
        female: femaleStudents,
        byGrade: gradeStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取学生统计失败',
      error: error.message
    });
  }
};

// 班级统计
exports.getClassStats = async (req, res) => {
  try {
    const Class = require('../models/Class');
    const Student = require('../models/Student');
    
    const totalClasses = await Class.countDocuments({ isActive: true });
    
    const classStats = await Class.aggregate([
      { $match: { isActive: true } },
      { $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: 'class',
          as: 'students'
        }
      },
      { $project: {
          name: 1,
          grade: 1,
          capacity: 1,
          currentEnrollment: { $size: '$students' },
          occupancyRate: {
            $multiply: [
              { $divide: [{ $size: '$students' }, '$capacity'] },
              100
            ]
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalClasses,
        classes: classStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取班级统计失败',
      error: error.message
    });
  }
};

// 作业统计
exports.getAssignmentStats = async (req, res) => {
  try {
    const Assignment = require('../models/Assignment');
    const Submission = require('../models/Submission');
    
    const totalAssignments = await Assignment.countDocuments({ isPublished: true });
    const overdueAssignments = await Assignment.countDocuments({
      isPublished: true,
      dueDate: { $lt: new Date() }
    });
    
    const submissionStats = await Submission.aggregate([
      { $group: {
          _id: '$assignment',
          submissionCount: { $sum: 1 },
          avgScore: { $avg: '$grade.percentage' },
          onTimeSubmissions: {
            $sum: {
              $cond: [{ $lte: ['$submittedAt', '$dueDate'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalAssignments,
        overdue: overdueAssignments,
        submissions: submissionStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取作业统计失败',
      error: error.message
    });
  }
};

// 性能分析
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const Grade = require('../models/Grade');
    const Student = require('../models/Student');
    
    const performanceData = await Grade.aggregate([
      { $group: {
          _id: '$student',
          avgGrade: { $avg: '$percentage' },
          totalCredits: { $sum: '$credits' },
          gradeCount: { $sum: 1 }
        }
      },
      { $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      { $project: {
          studentName: '$student.name',
          studentId: '$student.studentId',
          grade: '$student.grade',
          avgGrade: 1,
          totalCredits: 1,
          gradeCount: 1
        }
      },
      { $sort: { avgGrade: -1 } }
    ]);
    
    const gradeDistribution = await Grade.aggregate([
      { $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 60, 70, 80, 90, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$percentage' }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        studentPerformance: performanceData,
        gradeDistribution: gradeDistribution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取性能分析失败',
      error: error.message
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    // 获取基础统计数据
    const totalStudents = await Student.countDocuments({ enrollmentStatus: 'enrolled' });
    const totalClasses = await Class.countDocuments({ isActive: true });
    
    // 获取待批改作业数
    const pendingAssignments = await Submission.countDocuments({ 
      status: { $in: ['submitted', 'reviewed'] }
    });
    
    // 计算平均出勤率
    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 最近30天
    });
    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
    const averageAttendance = attendanceRecords.length > 0 
      ? Math.round((presentCount / attendanceRecords.length) * 100) 
      : 0;
    
    // 年级分布 - 添加结果数量限制
    const gradeDistribution = await Student.aggregate([
      { $match: { enrollmentStatus: 'enrolled' } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 20 } // 限制最多20个年级
    ]);
    
    // 成绩分布统计 - 限制数据量防止内存溢出
    const recentGrades = await Grade.find({
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 最近3个月
    })
    .limit(10000) // 限制最多10000条记录
    .select('percentage type'); // 只选择需要的字段
    
    const gradeStats = {
      excellent: recentGrades.filter(g => g.percentage >= 90).length,
      good: recentGrades.filter(g => g.percentage >= 80 && g.percentage < 90).length,
      average: recentGrades.filter(g => g.percentage >= 70 && g.percentage < 80).length,
      poor: recentGrades.filter(g => g.percentage < 70).length
    };
    
    // 作业提交趋势（最近6个月）
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const submissionTrend = await Submission.aggregate([
      { 
        $match: { 
          submittedAt: { $gte: sixMonthsAgo },
          status: { $in: ['submitted', 'graded', 'returned'] }
        } 
      },
      { 
        $group: {
          _id: { 
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 } // 最多12个月的数据
    ]);
    
    // 格式化提交趋势数据
    const submissionData = {
      labels: [],
      data: []
    };
    
    submissionTrend.forEach(item => {
      const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      submissionData.labels.push(monthNames[item._id.month - 1]);
      submissionData.data.push(item.count);
    });
    
    // 课程活跃度（基于讨论和作业提交） - 限制课程数量
    const courses = await Course.find({ isActive: true })
      .select('name subject')
      .limit(50); // 最多50门课程
    const courseActivity = await Promise.all(
      courses.map(async (course) => {
        // 计算该课程的作业提交数
        const assignments = await Assignment.find({ course: course._id });
        const assignmentIds = assignments.map(a => a._id);
        const submissionCount = await Submission.countDocuments({
          assignment: { $in: assignmentIds },
          submittedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });
        
        // 简单的活跃度计算（可以根据需要调整算法）
        const activityScore = Math.min(100, (submissionCount * 10) + Math.random() * 20);
        
        return {
          subject: course.subject || course.name,
          activity: Math.round(activityScore)
        };
      })
    );
    
    // 格式化课程活跃度数据
    const courseActivityData = {
      labels: courseActivity.map(item => item.subject),
      data: courseActivity.map(item => item.activity)
    };
    
    const stats = {
      totalStudents,
      totalClasses,
      pendingAssignments,
      averageAttendance,
      gradeDistribution,
      gradeStats,
      submissionTrend: submissionData,
      courseActivity: courseActivityData
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
};