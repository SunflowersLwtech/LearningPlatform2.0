const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');

const seedData = async () => {
  try {
    console.log('开始初始化数据...');
    
    await Staff.deleteMany({});
    await Student.deleteMany({});
    await Class.deleteMany({});
    await Course.deleteMany({});
    await Assignment.deleteMany({});
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const principal = new Staff({
      staffId: 'ADMIN001',
      name: '张校长',
      email: 'principal@school.edu',
      password: hashedPassword,
      role: 'principal',
      department: '校长办公室',
      permissions: {
        canManageStudents: true,
        canManageGrades: true,
        canManageSchedule: true,
        canAccessReports: true,
        canManageSystem: true
      }
    });
    await principal.save();
    
    const director = new Staff({
      staffId: 'DIR001',
      name: '李主任',
      email: 'director@school.edu',
      password: hashedPassword,
      role: 'director',
      department: '教务处',
      permissions: {
        canManageStudents: true,
        canManageGrades: true,
        canManageSchedule: true,
        canAccessReports: true,
        canManageSystem: false
      }
    });
    await director.save();
    
    const teachers = [
      {
        staffId: 'TEA001',
        name: '王老师',
        email: 'wang@school.edu',
        password: hashedPassword,
        role: 'head_teacher',
        department: '语文组',
        subjects: ['语文'],
        permissions: {
          canManageStudents: true,
          canManageGrades: true,
          canManageSchedule: false,
          canAccessReports: true,
          canManageSystem: false
        }
      },
      {
        staffId: 'TEA002',
        name: '刘老师',
        email: 'liu@school.edu',
        password: hashedPassword,
        role: 'teacher',
        department: '数学组',
        subjects: ['数学'],
        permissions: {
          canManageStudents: false,
          canManageGrades: true,
          canManageSchedule: false,
          canAccessReports: false,
          canManageSystem: false
        }
      },
      {
        staffId: 'TEA003',
        name: '赵老师',
        email: 'zhao@school.edu',
        password: hashedPassword,
        role: 'teacher',
        department: '英语组',
        subjects: ['英语'],
        permissions: {
          canManageStudents: false,
          canManageGrades: true,
          canManageSchedule: false,
          canAccessReports: false,
          canManageSystem: false
        }
      }
    ];
    
    const savedTeachers = await Staff.insertMany(teachers);
    
    const classes = [
      {
        classId: 'CLASS2023001',
        name: '高一(1)班',
        grade: '高一',
        academicYear: '2023',
        headTeacher: savedTeachers[0]._id,
        capacity: 40,
        classroom: {
          building: 'A栋',
          room: '101',
          floor: 1
        }
      },
      {
        classId: 'CLASS2023002',
        name: '高一(2)班',
        grade: '高一',
        academicYear: '2023',
        headTeacher: savedTeachers[0]._id,
        capacity: 40,
        classroom: {
          building: 'A栋',
          room: '102',
          floor: 1
        }
      },
      {
        classId: 'CLASS2023003',
        name: '高二(1)班',
        grade: '高二',
        academicYear: '2023',
        capacity: 38,
        classroom: {
          building: 'A栋',
          room: '201',
          floor: 2
        }
      }
    ];
    
    const savedClasses = await Class.insertMany(classes);
    
    const students = [];
    for (let i = 1; i <= 60; i++) {
      const classIndex = Math.floor((i - 1) / 20);
      const studentId = `2023${String(i).padStart(4, '0')}`;
      // 为每个学生创建密码哈希（使用学号作为默认密码）
      const hashedPassword = await bcrypt.hash(studentId, salt);
      
      students.push({
        studentId,
        name: `学生${i}`,
        password: hashedPassword, // 添加必需的密码字段
        gender: i % 2 === 0 ? 'female' : 'male',
        dateOfBirth: new Date(2005, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        grade: savedClasses[classIndex].grade,
        class: savedClasses[classIndex]._id,
        contactInfo: {
          phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          email: `student${i}@school.edu`
        },
        familyMembers: [{
          name: `家长${i}`,
          relationship: '父亲',
          phone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          occupation: '工程师'
        }]
      });
    }
    
    await Student.insertMany(students);
    
    for (const cls of savedClasses) {
      const studentsInClass = await Student.countDocuments({ class: cls._id });
      await Class.findByIdAndUpdate(cls._id, { currentEnrollment: studentsInClass });
    }
    
    const courses = [
      {
        courseId: 'COURSE001',
        name: '高中语文',
        subject: '语文',
        grade: '高一',
        semester: 'spring',
        academicYear: '2023',
        teacher: savedTeachers[0]._id,
        enrolledClasses: [savedClasses[0]._id, savedClasses[1]._id],
        description: '高中语文基础课程',
        credits: 4
      },
      {
        courseId: 'COURSE002',
        name: '高中数学',
        subject: '数学',
        grade: '高一',
        semester: 'spring',
        academicYear: '2023',
        teacher: savedTeachers[1]._id,
        enrolledClasses: [savedClasses[0]._id, savedClasses[1]._id],
        description: '高中数学基础课程',
        credits: 4
      },
      {
        courseId: 'COURSE003',
        name: '高中英语',
        subject: '英语',
        grade: '高一',
        semester: 'spring',
        academicYear: '2023',
        teacher: savedTeachers[2]._id,
        enrolledClasses: [savedClasses[0]._id, savedClasses[1]._id],
        description: '高中英语基础课程',
        credits: 4
      }
    ];
    
    const savedCourses = await Course.insertMany(courses);
    
    const assignments = [
      {
        title: '语文作文练习',
        description: '写一篇关于春天的作文，不少于800字',
        course: savedCourses[0]._id,
        teacher: savedTeachers[0]._id,
        type: 'homework',
        assignedTo: [{
          class: savedClasses[0]._id,
          students: await Student.find({ class: savedClasses[0]._id }).distinct('_id')
        }],
        startDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalPoints: 100,
        isPublished: true
      },
      {
        title: '数学练习题',
        description: '完成教材第3章练习题',
        course: savedCourses[1]._id,
        teacher: savedTeachers[1]._id,
        type: 'homework',
        assignedTo: [{
          class: savedClasses[0]._id,
          students: await Student.find({ class: savedClasses[0]._id }).distinct('_id')
        }],
        questions: [
          {
            questionNumber: 1,
            type: 'multiple_choice',
            question: '下列哪个是质数？',
            options: ['4', '6', '7', '8'],
            correctAnswer: '7',
            points: 10
          },
          {
            questionNumber: 2,
            type: 'short_answer',
            question: '计算 2 + 3 × 4 的结果',
            correctAnswer: '14',
            points: 10
          }
        ],
        startDate: new Date(),
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        totalPoints: 20,
        isPublished: true
      }
    ];
    
    await Assignment.insertMany(assignments);
    
    console.log('数据初始化完成！');
    console.log('管理员账号: principal@school.edu / admin123');
    console.log('教师账号: wang@school.edu / admin123');
    console.log('学生登录使用学号作为用户名和密码，如: 20230001 / 20230001');
    
  } catch (error) {
    console.error('数据初始化失败:', error);
    throw error;
  }
};

module.exports = seedData;