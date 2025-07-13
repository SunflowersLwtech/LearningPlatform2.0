const dotenv = require('dotenv');
const connectDB = require('../config/database');
const Student = require('../src/models/Student');
const bcrypt = require('bcryptjs');

dotenv.config();

const migrateStudentPasswords = async () => {
  try {
    await connectDB();
    console.log('开始迁移学生密码...');
    
    // 查找所有没有密码的学生
    const studentsWithoutPassword = await Student.find({ password: { $exists: false } });
    console.log(`找到 ${studentsWithoutPassword.length} 个需要迁移密码的学生`);
    
    for (const student of studentsWithoutPassword) {
      // 默认密码设为学号
      const defaultPassword = student.studentId;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);
      
      student.password = hashedPassword;
      await student.save();
      
      console.log(`已为学生 ${student.name} (${student.studentId}) 设置默认密码`);
    }
    
    console.log('学生密码迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('密码迁移失败:', error);
    process.exit(1);
  }
};

migrateStudentPasswords();