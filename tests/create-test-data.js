const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Database connected'))
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// Import models
const Student = require('../src/models/Student');
const Class = require('../src/models/Class');
const Course = require('../src/models/Course');
const Assignment = require('../src/models/Assignment');
const Staff = require('../src/models/Staff');
const Resource = require('../src/models/Resource');
const Discussion = require('../src/models/Discussion');

async function createTestData() {
  try {
    console.log('🔧 Creating test data for comprehensive testing...\n');

    // Check if test data already exists
    const existingStudents = await Student.countDocuments();
    if (existingStudents > 0) {
      console.log('✅ Test data already exists. Skipping creation.');
      console.log(`Found ${existingStudents} students in database.`);
      return;
    }

    // Create test classes
    console.log('1. Creating test classes...');
    const testClasses = await Class.create([
      {
        name: '测试班级A',
        grade: '一年级',
        academicYear: '2023-2024',
        capacity: 30,
        room: 'A101',
        floor: 1,
        building: '教学楼A',
        schedule: {
          periods: [
            { day: 1, startTime: '08:00', endTime: '08:45', subject: '语文' },
            { day: 1, startTime: '09:00', endTime: '09:45', subject: '数学' }
          ]
        },
        isActive: true
      },
      {
        name: '测试班级B',
        grade: '二年级',
        academicYear: '2023-2024',
        capacity: 28,
        room: 'B102',
        floor: 1,
        building: '教学楼B',
        schedule: {
          periods: [
            { day: 1, startTime: '08:00', endTime: '08:45', subject: '语文' },
            { day: 1, startTime: '09:00', endTime: '09:45', subject: '数学' }
          ]
        },
        isActive: true
      }
    ]);
    console.log(`✅ Created ${testClasses.length} test classes`);

    // Create test courses
    console.log('2. Creating test courses...');
    const testCourses = await Course.create([
      {
        name: '测试语文课程',
        subject: '语文',
        code: 'TEST-CHI-001',
        description: '测试用语文课程',
        credits: 3,
        totalHours: 72,
        weeklyHours: 4,
        academicYear: '2023-2024',
        semester: '上学期',
        prerequisites: [],
        objectives: ['提高语文水平', '培养阅读理解能力'],
        syllabus: {
          weeks: [
            { week: 1, topic: '古诗词鉴赏', content: '学习唐诗宋词' },
            { week: 2, topic: '现代文阅读', content: '理解现代文章' }
          ]
        },
        isActive: true
      },
      {
        name: '测试数学课程',
        subject: '数学',
        code: 'TEST-MATH-001',
        description: '测试用数学课程',
        credits: 4,
        totalHours: 96,
        weeklyHours: 5,
        academicYear: '2023-2024',
        semester: '上学期',
        prerequisites: [],
        objectives: ['掌握基础数学知识', '培养逻辑思维能力'],
        syllabus: {
          weeks: [
            { week: 1, topic: '代数基础', content: '学习基本代数运算' },
            { week: 2, topic: '几何入门', content: '了解几何图形' }
          ]
        },
        isActive: true
      }
    ]);
    console.log(`✅ Created ${testCourses.length} test courses`);

    // Create test students
    console.log('3. Creating test students...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('20230001', 10);
    
    const testStudents = await Student.create([
      {
        studentId: 'TEST001',
        name: '测试学生A',
        gender: 'male',
        dateOfBirth: new Date('2010-05-15'),
        grade: '一年级',
        class: testClasses[0]._id,
        phone: '13800138001',
        email: 'test.student.a@school.edu',
        address: '测试地址A',
        emergencyContact: {
          name: '测试家长A',
          relationship: '父亲',
          phone: '13900139001'
        },
        password: hashedPassword,
        enrollmentDate: new Date('2023-09-01'),
        isActive: true
      },
      {
        studentId: 'TEST002',
        name: '测试学生B',
        gender: 'female',
        dateOfBirth: new Date('2009-08-20'),
        grade: '二年级',
        class: testClasses[1]._id,
        phone: '13800138002',
        email: 'test.student.b@school.edu',
        address: '测试地址B',
        emergencyContact: {
          name: '测试家长B',
          relationship: '母亲',
          phone: '13900139002'
        },
        password: hashedPassword,
        enrollmentDate: new Date('2023-09-01'),
        isActive: true
      }
    ]);
    console.log(`✅ Created ${testStudents.length} test students`);

    // Create test assignments
    console.log('4. Creating test assignments...');
    const staff = await Staff.findOne({ role: 'principal' });
    
    const testAssignments = await Assignment.create([
      {
        title: '测试作业A - 语文阅读',
        description: '完成指定阅读材料并写读后感',
        course: testCourses[0]._id,
        teacher: staff._id,
        type: 'homework',
        instructions: '1. 阅读指定文章\n2. 写500字读后感\n3. 注意语言表达',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        totalPoints: 100,
        isPublished: true,
        assignedTo: {
          classes: [testClasses[0]._id],
          students: [testStudents[0]._id]
        },
        rubric: {
          criteria: [
            { name: '内容理解', points: 40, description: '对文章内容的理解程度' },
            { name: '语言表达', points: 30, description: '语言表达的准确性' },
            { name: '创新思考', points: 30, description: '独特见解和思考深度' }
          ]
        }
      },
      {
        title: '测试作业B - 数学练习',
        description: '完成代数运算练习题',
        course: testCourses[1]._id,
        teacher: staff._id,
        type: 'quiz',
        instructions: '1. 完成所有计算题\n2. 显示详细解题过程\n3. 检查答案准确性',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        totalPoints: 80,
        isPublished: true,
        assignedTo: {
          classes: [testClasses[1]._id],
          students: [testStudents[1]._id]
        },
        rubric: {
          criteria: [
            { name: '计算准确性', points: 50, description: '计算结果的正确性' },
            { name: '解题过程', points: 30, description: '解题步骤的完整性' }
          ]
        }
      }
    ]);
    console.log(`✅ Created ${testAssignments.length} test assignments`);

    // Create test resources
    console.log('5. Creating test resources...');
    const testResources = await Resource.create([
      {
        title: '测试教学资源A',
        description: '语文教学参考资料',
        type: 'document',
        subject: '语文',
        grade: '一年级',
        course: testCourses[0]._id,
        uploadedBy: staff._id,
        fileInfo: {
          originalName: 'test-resource-a.pdf',
          filePath: 'resources/test-resource-a.pdf',
          mimeType: 'application/pdf',
          size: 1024000
        },
        tags: ['教学', '参考', '语文'],
        isPublic: true,
        downloads: 0
      },
      {
        title: '测试教学资源B',
        description: '数学练习题集',
        type: 'exercise',
        subject: '数学',
        grade: '二年级',
        course: testCourses[1]._id,
        uploadedBy: staff._id,
        fileInfo: {
          originalName: 'test-resource-b.doc',
          filePath: 'resources/test-resource-b.doc',
          mimeType: 'application/msword',
          size: 512000
        },
        tags: ['练习', '数学', '题集'],
        isPublic: true,
        downloads: 0
      }
    ]);
    console.log(`✅ Created ${testResources.length} test resources`);

    // Create test discussions
    console.log('6. Creating test discussions...');
    const testDiscussions = await Discussion.create([
      {
        title: '测试讨论A - 学习方法交流',
        content: '大家来分享一下各自的学习方法和心得体会吧！',
        author: staff._id,
        authorType: 'staff',
        course: testCourses[0]._id,
        type: 'general',
        tags: ['学习方法', '交流', '心得'],
        isActive: true,
        isPinned: false,
        replies: []
      },
      {
        title: '测试讨论B - 作业疑问解答',
        content: '关于最近布置的数学作业，有什么疑问都可以在这里提出。',
        author: staff._id,
        authorType: 'staff',
        course: testCourses[1]._id,
        type: 'assignment',
        tags: ['作业', '疑问', '数学'],
        isActive: true,
        isPinned: true,
        replies: []
      }
    ]);
    console.log(`✅ Created ${testDiscussions.length} test discussions`);

    console.log('\n🎉 Test data creation completed successfully!');
    console.log('\nTest data summary:');
    console.log(`- Classes: ${testClasses.length}`);
    console.log(`- Courses: ${testCourses.length}`);
    console.log(`- Students: ${testStudents.length}`);
    console.log(`- Assignments: ${testAssignments.length}`);
    console.log(`- Resources: ${testResources.length}`);
    console.log(`- Discussions: ${testDiscussions.length}`);

    console.log('\nTest credentials:');
    console.log('- Staff: principal@school.edu / admin123');
    console.log('- Student: TEST001 / 20230001');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestData();