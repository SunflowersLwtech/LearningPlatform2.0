const dotenv = require('dotenv');
const connectDB = require('../config/database');
const seedData = require('../src/utils/seedData');

dotenv.config();

const runSeed = async () => {
  try {
    await connectDB();
    await seedData();
    console.log('种子数据创建成功');
    process.exit(0);
  } catch (error) {
    console.error('种子数据创建失败:', error);
    process.exit(1);
  }
};

runSeed();