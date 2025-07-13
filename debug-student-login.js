#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./src/models/Student');
const Staff = require('./src/models/Staff');

// 学生登录调试脚本
async function debugStudentLogin() {
    console.log('🔍 学生登录问题调试工具\n');
    
    try {
        // 连接数据库
        const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:liuwei20060607@localhost:27017/learning_platform?authSource=admin';
        console.log('📊 连接数据库:', mongoURI.replace(/\/\/.*@/, '//***:***@'));
        await mongoose.connect(mongoURI);
        console.log('✅ 数据库连接成功\n');
        
        // 1. 检查学生数据是否存在
        console.log('1️⃣ 检查学生数据...');
        const studentCount = await Student.countDocuments();
        console.log(`   学生总数: ${studentCount}`);
        
        if (studentCount === 0) {
            console.log('❌ 数据库中没有学生数据！');
            console.log('💡 建议运行: npm run init-db');
            return;
        }
        
        // 2. 检查测试学生
        console.log('\n2️⃣ 检查测试学生 (20230001)...');
        const testStudent = await Student.findOne({ studentId: '20230001' }).select('+password');
        
        if (!testStudent) {
            console.log('❌ 未找到学号为 20230001 的学生');
            
            // 显示现有学生
            const students = await Student.find({}, 'studentId name').limit(5);
            console.log('现有学生:');
            students.forEach(s => console.log(`   - ${s.studentId}: ${s.name}`));
            return;
        }
        
        console.log('✅ 找到测试学生');
        console.log(`   姓名: ${testStudent.name}`);
        console.log(`   学号: ${testStudent.studentId}`);
        console.log(`   状态: ${testStudent.enrollmentStatus}`);
        console.log(`   邮箱: ${testStudent.contactInfo?.email || '未设置'}`);
        console.log(`   密码hash: ${testStudent.password ? '存在' : '缺失'}`);
        
        // 3. 测试密码验证
        console.log('\n3️⃣ 测试密码验证...');
        if (!testStudent.password) {
            console.log('❌ 学生没有设置密码');
            return;
        }
        
        const passwordTests = [
            '20230001',
            'student123',
            'admin123',
            ''
        ];
        
        for (const testPassword of passwordTests) {
            const isValid = await bcrypt.compare(testPassword, testStudent.password);
            console.log(`   密码 "${testPassword}": ${isValid ? '✅ 正确' : '❌ 错误'}`);
            if (isValid) break;
        }
        
        // 4. 测试查询逻辑
        console.log('\n4️⃣ 测试查询逻辑...');
        
        // 按学号查询
        const byStudentId = await Student.findOne({ studentId: '20230001' }).select('+password');
        console.log(`   按学号查询: ${byStudentId ? '✅ 成功' : '❌ 失败'}`);
        
        // 按邮箱查询
        if (testStudent.contactInfo?.email) {
            const byEmail = await Student.findOne({ 'contactInfo.email': testStudent.contactInfo.email }).select('+password');
            console.log(`   按邮箱查询: ${byEmail ? '✅ 成功' : '❌ 失败'}`);
        }
        
        // 5. 模拟完整登录流程
        console.log('\n5️⃣ 模拟完整登录流程...');
        
        const loginData = {
            identifier: '20230001',
            password: '20230001',
            userType: 'student'
        };
        
        // 验证输入
        if (!loginData.identifier || !loginData.password || !loginData.userType) {
            console.log('❌ 登录数据验证失败');
            return;
        }
        console.log('✅ 输入验证通过');
        
        // 查找用户
        const isEmail = loginData.identifier.includes('@');
        const query = isEmail ? { 'contactInfo.email': loginData.identifier } : { studentId: loginData.identifier };
        const user = await Student.findOne(query).select('+password');
        
        if (!user) {
            console.log('❌ 用户查找失败');
            return;
        }
        console.log('✅ 用户查找成功');
        
        // 验证密码
        const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
        if (!isPasswordValid) {
            console.log('❌ 密码验证失败');
            return;
        }
        console.log('✅ 密码验证成功');
        
        // 检查状态
        if (user.enrollmentStatus !== 'enrolled') {
            console.log(`❌ 学生状态异常: ${user.enrollmentStatus}`);
            return;
        }
        console.log('✅ 学生状态正常');
        
        console.log('\n🎉 模拟登录流程完全成功！');
        
        // 6. 对比教职工数据
        console.log('\n6️⃣ 对比教职工数据结构...');
        const staffCount = await Staff.countDocuments();
        const testStaff = await Staff.findOne({ email: 'principal@school.edu' }).select('+password');
        
        console.log(`   教职工总数: ${staffCount}`);
        console.log(`   测试教职工: ${testStaff ? '存在' : '不存在'}`);
        
        if (testStaff) {
            const staffPasswordValid = await bcrypt.compare('admin123', testStaff.password);
            console.log(`   教职工密码验证: ${staffPasswordValid ? '✅ 正确' : '❌ 错误'}`);
        }
        
        // 7. 生成修复建议
        console.log('\n💡 修复建议:');
        console.log('1. 确保生产环境数据库包含学生数据');
        console.log('2. 检查生产环境的密码哈希是否正确');
        console.log('3. 验证网络连接和API路由');
        console.log('4. 检查CORS配置');
        console.log('5. 查看服务器错误日志');
        
    } catch (error) {
        console.error('❌ 调试过程出错:', error.message);
        console.error('详细错误:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 数据库连接已关闭');
    }
}

// 运行调试
if (require.main === module) {
    debugStudentLogin();
}

module.exports = { debugStudentLogin };