#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 用于修复种子数据中的密码问题和其他数据一致性问题
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 导入模型
const Student = require('../src/models/Student');
const Staff = require('../src/models/Staff');
const Class = require('../src/models/Class');

async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_platform';
    await mongoose.connect(mongoURI);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

async function fixStudentPasswords() {
  console.log('🔧 修复学生密码问题...');
  
  try {
    // 查找没有密码的学生
    const studentsWithoutPassword = await Student.find({
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: '' }
      ]
    });
    
    if (studentsWithoutPassword.length === 0) {
      console.log('✅ 所有学生都有密码，无需修复');
      return;
    }
    
    console.log(`🔍 找到 ${studentsWithoutPassword.length} 个没有密码的学生`);
    
    const salt = await bcrypt.genSalt(10);
    let fixedCount = 0;
    
    for (const student of studentsWithoutPassword) {
      try {
        // 使用学号作为默认密码
        const defaultPassword = student.studentId;
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);
        
        await Student.findByIdAndUpdate(student._id, {
          password: hashedPassword
        });
        
        fixedCount++;
        console.log(`✅ 修复学生 ${student.name} (${student.studentId}) 的密码`);
      } catch (error) {
        console.error(`❌ 修复学生 ${student.studentId} 密码失败:`, error.message);
      }
    }
    
    console.log(`🎉 成功修复 ${fixedCount} 个学生的密码`);
  } catch (error) {
    console.error('❌ 修复学生密码时出错:', error);
  }
}

async function fixClassEnrollmentCounts() {
  console.log('🔧 修复班级人数统计...');
  
  try {
    const classes = await Class.find({});
    let fixedCount = 0;
    
    for (const cls of classes) {
      // 计算实际学生数量
      const actualCount = await Student.countDocuments({ 
        class: cls._id,
        enrollmentStatus: 'enrolled'
      });
      
      if (cls.currentEnrollment !== actualCount) {
        await Class.findByIdAndUpdate(cls._id, {
          currentEnrollment: actualCount
        });
        
        console.log(`✅ 修复班级 ${cls.name}: ${cls.currentEnrollment} -> ${actualCount}`);
        fixedCount++;
      }
    }
    
    if (fixedCount === 0) {
      console.log('✅ 所有班级人数统计正确，无需修复');
    } else {
      console.log(`🎉 成功修复 ${fixedCount} 个班级的人数统计`);
    }
  } catch (error) {
    console.error('❌ 修复班级人数统计时出错:', error);
  }
}

async function validateDataIntegrity() {
  console.log('🔍 验证数据完整性...');
  
  const issues = [];
  
  try {
    // 检查学生的班级引用
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
    
    if (studentsWithInvalidClass.length > 0) {
      issues.push(`❌ ${studentsWithInvalidClass.length} 个学生的班级引用无效`);
      studentsWithInvalidClass.forEach(student => {
        console.log(`  - 学生: ${student.name} (${student.studentId}) -> 班级ID: ${student.class}`);
      });
    }
    
    // 检查教职工密码
    const staffWithoutPassword = await Staff.find({
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: '' }
      ]
    });
    
    if (staffWithoutPassword.length > 0) {
      issues.push(`❌ ${staffWithoutPassword.length} 个教职工没有密码`);
    }
    
    // 检查学生密码
    const studentsWithoutValidPassword = await Student.find({
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: '' }
      ]
    });
    
    if (studentsWithoutValidPassword.length > 0) {
      issues.push(`❌ ${studentsWithoutValidPassword.length} 个学生没有有效密码`);
    }
    
    if (issues.length === 0) {
      console.log('✅ 数据完整性检查通过');
    } else {
      console.log('⚠️  发现以下数据完整性问题:');
      issues.forEach(issue => console.log(issue));
    }
    
    return issues;
  } catch (error) {
    console.error('❌ 数据完整性验证失败:', error);
    return ['数据完整性验证过程出错'];
  }
}

async function createDefaultAdmin() {
  console.log('🔧 检查默认管理员账户...');
  
  try {
    const adminExists = await Staff.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('🆕 创建默认管理员账户...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const admin = new Staff({
        staffId: 'ADMIN000',
        name: '系统管理员',
        email: 'admin@school.edu',
        password: hashedPassword,
        role: 'admin',
        department: '信息技术部',
        isActive: true,
        permissions: {
          canManageStudents: true,
          canManageGrades: true,
          canManageSchedule: true,
          canAccessReports: true,
          canManageSystem: true
        }
      });
      
      await admin.save();
      console.log('✅ 默认管理员账户创建成功');
      console.log('   账号: admin@school.edu');
      console.log('   密码: admin123');
    } else {
      console.log('✅ 管理员账户已存在');
    }
  } catch (error) {
    console.error('❌ 创建默认管理员失败:', error);
  }
}

async function main() {
  console.log('🚀 开始数据库初始化和修复...\n');
  
  await connectDB();
  
  // 执行修复操作
  await fixStudentPasswords();
  console.log('');
  
  await fixClassEnrollmentCounts();
  console.log('');
  
  await createDefaultAdmin();
  console.log('');
  
  // 最终验证
  const issues = await validateDataIntegrity();
  console.log('');
  
  if (issues.length === 0) {
    console.log('🎉 数据库初始化和修复完成！所有检查通过');
  } else {
    console.log('⚠️  数据库修复完成，但仍有以下问题需要手动处理:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  console.log('\n📋 登录信息汇总:');
  console.log('   管理员: admin@school.edu / admin123');
  console.log('   校长: principal@school.edu / admin123');
  console.log('   教师: wang@school.edu / admin123');
  console.log('   学生: 使用学号登录（如: 20230001 / 20230001）');
  
  await mongoose.disconnect();
  console.log('\n✅ 数据库连接已关闭');
}

// 处理未捕获的错误
process.on('unhandledRejection', (err) => {
  console.error('❌ 未处理的Promise拒绝:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  fixStudentPasswords,
  fixClassEnrollmentCounts,
  validateDataIntegrity,
  createDefaultAdmin
};