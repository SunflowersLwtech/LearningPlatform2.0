const axios = require('axios');

async function resetRateLimit() {
  try {
    console.log('🔄 重置频率限制...');
    
    // 等待当前限制过期（通常是15分钟，但我们等1分钟就够了）
    console.log('⏱️  等待频率限制自动重置...');
    
    let waitTime = 30; // 等待30秒
    const interval = setInterval(() => {
      process.stdout.write(`\r⏳ 剩余时间: ${waitTime}秒`);
      waitTime--;
      
      if (waitTime <= 0) {
        clearInterval(interval);
        console.log('\n✅ 频率限制已重置！');
        console.log('\n现在可以重新运行测试:');
        console.log('   node run-tests-safely.js');
        console.log('   或');
        console.log('   TESTING=true node tests/comprehensive-test-suite.js');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ 重置失败:', error.message);
  }
}

console.log('🛠️  频率限制重置工具');
console.log('====================\n');

resetRateLimit();