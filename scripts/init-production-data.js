#!/usr/bin/env node

/**
 * 生产环境数据初始化脚本
 * 用于在Render等云平台上初始化基础数据
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 导入模型
const Student = require('../src/models/Student');
const Staff = require('../src/models/Staff');
const Class = require('../src/models/Class');

async function connectDB() {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('MONGODB_URI环境变量未设置');
        }
        
        console.log('🔌 连接数据库...');
        await mongoose.connect(mongoURI);
        console.log('✅ 数据库连接成功');
    } catch (error) {
        console.error('❌ 数据库连接失败:', error);
        process.exit(1);
    }
}

async function createTestStudent() {
    console.log('👨‍🎓 创建测试学生...');
    
    // 检查是否已存在
    const existingStudent = await Student.findOne({ studentId: '20230001' });
    if (existingStudent) {
        console.log('✅ 测试学生已存在');
        return existingStudent;
    }
    
    // 创建密码哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('20230001', salt);
    
    // 创建学生
    const student = new Student({
        studentId: '20230001',
        name: '测试学生',
        gender: 'male',
        dateOfBirth: new Date('2005-01-01'),
        grade: '高一',
        contactInfo: {
            email: 'student@test.com',
            phone: '13800138000'
        },
        enrollmentStatus: 'enrolled',
        password: hashedPassword
    });
    
    await student.save();
    console.log('✅ 测试学生创建成功');
    return student;
}

async function createTestStaff() {
    console.log('👨‍🏫 创建测试教职工...');
    
    // 检查是否已存在
    const existingStaff = await Staff.findOne({ email: 'principal@school.edu' });
    if (existingStaff) {
        console.log('✅ 测试教职工已存在');
        return existingStaff;
    }
    
    // 创建密码哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // 创建教职工
    const staff = new Staff({
        staffId: 'ADMIN001',
        name: '测试校长',
        email: 'principal@school.edu',
        password: hashedPassword,
        role: 'principal',
        department: '校长办公室',
        isActive: true,
        permissions: {
            canManageStudents: true,
            canManageGrades: true,
            canManageSchedule: true,
            canAccessReports: true,
            canManageSystem: true
        }
    });
    
    await staff.save();
    console.log('✅ 测试教职工创建成功');
    return staff;
}

async function createTestClass() {
    console.log('🏫 创建测试班级...');
    
    // 检查是否已存在
    const existingClass = await Class.findOne({ classId: 'C001' });
    if (existingClass) {
        console.log('✅ 测试班级已存在');
        return existingClass;
    }
    
    // 创建班级
    const classData = new Class({
        classId: 'C001',
        name: '高一1班',
        grade: '高一',
        academicYear: new Date().getFullYear(),
        capacity: 40,
        students: []
    });
    
    await classData.save();
    console.log('✅ 测试班级创建成功');
    return classData;
}

async function verifyData() {
    console.log('\n🔍 验证数据完整性...');
    
    // 验证学生登录
    const student = await Student.findOne({ studentId: '20230001' }).select('+password');
    if (student) {
        const passwordValid = await bcrypt.compare('20230001', student.password);
        console.log(`✅ 学生数据验证: ${passwordValid ? '通过' : '失败'}`);
    }
    
    // 验证教职工登录
    const staff = await Staff.findOne({ email: 'principal@school.edu' }).select('+password');
    if (staff) {
        const passwordValid = await bcrypt.compare('admin123', staff.password);
        console.log(`✅ 教职工数据验证: ${passwordValid ? '通过' : '失败'}`);
    }
    
    // 统计数据
    const studentCount = await Student.countDocuments();
    const staffCount = await Staff.countDocuments();
    const classCount = await Class.countDocuments();
    
    console.log(`📊 数据统计:`);
    console.log(`   学生: ${studentCount}`);
    console.log(`   教职工: ${staffCount}`);
    console.log(`   班级: ${classCount}`);
}

async function main() {
    console.log('🚀 生产环境数据初始化开始\n');
    
    try {
        await connectDB();
        
        await createTestStudent();
        await createTestStaff();
        await createTestClass();
        
        await verifyData();
        
        console.log('\n🎉 数据初始化完成！');
        console.log('\n🔑 测试账号:');
        console.log('学生: 20230001 / 20230001');
        console.log('管理员: principal@school.edu / admin123');
        
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 数据库连接已关闭');
    }
}

// 运行初始化
if (require.main === module) {
    main();
}

module.exports = { main };