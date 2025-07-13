#!/usr/bin/env node

const http = require('http');
const https = require('https');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const API_BASE = BASE_URL + '/api';

// 测试结果统计
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// HTTP请求封装
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 测试函数
async function test(name, testFn) {
  testResults.total++;
  console.log(`\n🔍 测试: ${name}`);
  
  try {
    const result = await testFn();
    if (result) {
      console.log(`✅ 通过: ${name}`);
      testResults.passed++;
    } else {
      console.log(`❌ 失败: ${name}`);
      testResults.failed++;
      testResults.errors.push(name);
    }
  } catch (error) {
    console.log(`❌ 错误: ${name} - ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`${name}: ${error.message}`);
  }
}

// 具体测试用例
async function testAPI() {
  console.log('\n🚀 开始API功能测试...\n');

  // 1. 测试服务器连接
  await test('服务器连接', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const result = await makeRequest(options);
    return result.statusCode === 200 && result.data?.success;
  });

  // 2. 测试获取角色列表
  await test('获取角色列表', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/roles',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const result = await makeRequest(options);
    return result.statusCode === 200 && result.data?.success;
  });

  // 3. 测试管理员登录
  await test('管理员登录', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const loginData = {
      identifier: 'principal@school.edu',
      password: 'admin123',
      userType: 'staff'
    };
    
    const result = await makeRequest(options, loginData);
    return result.statusCode === 200 && result.data?.success && result.data?.data?.accessToken;
  });

  // 4. 测试错误的登录凭据
  await test('错误登录凭据处理', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const loginData = {
      identifier: 'wrong@email.com',
      password: 'wrongpassword',
      userType: 'staff'
    };
    
    const result = await makeRequest(options, loginData);
    return result.statusCode === 401 && !result.data?.success;
  });

  // 5. 测试输入验证 - 空密码
  await test('输入验证 - 空密码', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const loginData = {
      identifier: 'test@email.com',
      password: '',
      userType: 'staff'
    };
    
    const result = await makeRequest(options, loginData);
    return result.statusCode === 400;
  });

  // 6. 测试NoSQL注入防护
  await test('NoSQL注入防护', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const loginData = {
      identifier: { $ne: null },
      password: { $ne: null },
      userType: 'staff'
    };
    
    const result = await makeRequest(options, loginData);
    // 应该被安全中间件拦截或返回错误
    return result.statusCode >= 400;
  });

  // 7. 测试注册功能 - 无效角色
  await test('注册验证 - 无效角色', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const registerData = {
      userType: 'staff',
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPass123',
      confirmPassword: 'TestPass123',
      staffId: 'TEST001',
      role: 'admin', // 应该被拒绝
      department: 'IT'
    };
    
    const result = await makeRequest(options, registerData);
    return result.statusCode === 400; // 应该拒绝admin角色注册
  });

  // 8. 测试有效的教师注册
  await test('有效教师注册', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const registerData = {
      userType: 'staff',
      name: 'Test Teacher',
      email: `test${Date.now()}@example.com`, // 使用时间戳避免重复
      password: 'TestPass123',
      confirmPassword: 'TestPass123',
      staffId: `TEST${Date.now()}`,
      role: 'teacher',
      department: 'Mathematics'
    };
    
    const result = await makeRequest(options, registerData);
    return result.statusCode === 201 && result.data?.success;
  });

  // 9. 测试密码强度验证
  await test('密码强度验证', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const registerData = {
      userType: 'staff',
      name: 'Test User',
      email: 'weak@example.com',
      password: 'weak', // 弱密码 - 不符合8位要求
      confirmPassword: 'weak',
      staffId: 'WEAK001',
      role: 'teacher',
      department: 'IT'
    };
    
    const result = await makeRequest(options, registerData);
    return result.statusCode === 400; // 应该拒绝弱密码
  });

  // 10. 测试安全头部
  await test('安全头部检查', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const result = await makeRequest(options);
    const headers = result.headers;
    
    return headers['x-xss-protection'] && 
           headers['x-content-type-options'] && 
           headers['x-frame-options'];
  });
}

// 前端测试
async function testFrontend() {
  console.log('\n🌐 开始前端功能测试...\n');

  // 1. 测试主页加载
  await test('主页加载', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    };
    
    const result = await makeRequest(options);
    return result.statusCode === 200 && 
           typeof result.data === 'string' && 
           result.data.includes('学习平台管理系统');
  });

  // 2. 测试静态资源加载
  await test('CSS文件加载', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/css/style.css',
      method: 'GET'
    };
    
    const result = await makeRequest(options);
    return result.statusCode === 200;
  });

  await test('JavaScript文件加载', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/js/app.js',
      method: 'GET'
    };
    
    const result = await makeRequest(options);
    return result.statusCode === 200 && 
           typeof result.data === 'string' && 
           result.data.includes('showLoginModal');
  });
}

// 数据库连接测试
async function testDatabase() {
  console.log('\n💾 开始数据库功能测试...\n');

  // 这里我们通过API间接测试数据库连接
  await test('数据库连接', async () => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/roles',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const result = await makeRequest(options);
    return result.statusCode === 200 && result.data?.success;
  });
}

// 主测试函数
async function runAllTests() {
  console.log('🧪 学习平台全功能测试\n');
  console.log('=' * 50);

  try {
    await testAPI();
    await testFrontend();
    await testDatabase();
  } catch (error) {
    console.error('测试运行出错:', error);
  }

  // 输出测试结果
  console.log('\n' + '=' * 50);
  console.log('📊 测试结果统计:');
  console.log(`✅ 通过: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ 失败: ${testResults.failed}/${testResults.total}`);
  console.log(`📈 成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n🐛 失败的测试:');
    testResults.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n🎯 测试完成!');
  
  // 如果有失败的测试，退出码为1
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 启动测试
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, test, makeRequest };