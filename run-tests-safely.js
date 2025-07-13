#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 启动安全测试环境...\n');

// 设置测试环境变量
process.env.TESTING = 'true';
process.env.NODE_ENV = 'test';

async function runTestsSafely() {
  try {
    console.log('📋 测试配置:');
    console.log('   - 环境: 测试模式');
    console.log('   - 频率限制: 宽松 (1000次/分钟)');
    console.log('   - 智能延迟: 启用');
    console.log('   - 错误重试: 启用\n');

    // 检查服务器是否运行
    console.log('🔍 检查服务器状态...');
    try {
      const axios = require('axios');
      await axios.get('http://localhost:3000/api', { timeout: 5000 });
      console.log('✅ 服务器正在运行\n');
    } catch (error) {
      console.log('❌ 服务器未运行，请先启动服务器:');
      console.log('   npm start\n');
      process.exit(1);
    }

    // 运行测试
    console.log('🚀 开始执行测试套件...\n');
    
    const testProcess = spawn('node', ['tests/comprehensive-test-suite.js'], {
      stdio: 'inherit',
      env: { ...process.env, TESTING: 'true', NODE_ENV: 'test' }
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 测试完成！');
        
        // 检查测试报告
        if (fs.existsSync('./test-report.json')) {
          const report = JSON.parse(fs.readFileSync('./test-report.json', 'utf8'));
          console.log('\n📊 测试结果摘要:');
          console.log(`   总测试数: ${report.summary.total}`);
          console.log(`   通过: ${report.summary.passed}`);
          console.log(`   失败: ${report.summary.failed}`);
          console.log(`   成功率: ${report.summary.successRate}%`);
          
          if (report.summary.failed > 0) {
            console.log('\n⚠️  存在失败测试，请查看详细报告:');
            console.log('   cat test-report.json');
          } else {
            console.log('\n✅ 所有测试通过！系统功能正常。');
          }
        }
        
        console.log('\n📄 查看完整报告: COMPREHENSIVE-TEST-REPORT.md');
      } else {
        console.log(`\n❌ 测试进程退出，代码: ${code}`);
      }
    });

    testProcess.on('error', (error) => {
      console.error(`\n❌ 测试执行失败: ${error.message}`);
    });

  } catch (error) {
    console.error(`❌ 测试启动失败: ${error.message}`);
    process.exit(1);
  }
}

// 清理函数
function cleanup() {
  console.log('\n🧹 清理测试环境...');
  // 重置环境变量
  delete process.env.TESTING;
  if (process.env.NODE_ENV === 'test') {
    delete process.env.NODE_ENV;
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

// 运行测试
runTestsSafely().catch(error => {
  console.error('❌ 测试运行失败:', error);
  cleanup();
  process.exit(1);
});