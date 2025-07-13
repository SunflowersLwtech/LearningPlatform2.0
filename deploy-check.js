#!/usr/bin/env node

const http = require('http');
const https = require('https');

// 部署环境检查脚本
console.log('🔍 学习平台部署环境检查\n');

// 配置检查
function checkEnvironment() {
    console.log('📋 环境变量检查:');
    
    const requiredVars = [
        'NODE_ENV',
        'PORT', 
        'MONGODB_URI',
        'JWT_SECRET'
    ];
    
    const missing = [];
    requiredVars.forEach(varName => {
        if (process.env[varName]) {
            console.log(`✅ ${varName}: ${varName === 'JWT_SECRET' ? '***已设置***' : process.env[varName]}`);
        } else {
            console.log(`❌ ${varName}: 未设置`);
            missing.push(varName);
        }
    });
    
    if (missing.length > 0) {
        console.log(`\n🚨 缺少必需的环境变量: ${missing.join(', ')}`);
        return false;
    }
    
    console.log('\n✅ 所有必需的环境变量已设置');
    return true;
}

// 端口检查
function checkPort() {
    console.log('\n🔌 端口检查:');
    const port = process.env.PORT || 3000;
    
    return new Promise((resolve) => {
        const server = require('net').createServer();
        
        server.listen(port, (err) => {
            if (err) {
                console.log(`❌ 端口 ${port} 被占用`);
                resolve(false);
            } else {
                console.log(`✅ 端口 ${port} 可用`);
                server.close();
                resolve(true);
            }
        });
        
        server.on('error', (err) => {
            console.log(`❌ 端口 ${port} 检查失败: ${err.message}`);
            resolve(false);
        });
    });
}

// API测试
function testAPI(baseUrl) {
    console.log(`\n🌐 API连接测试: ${baseUrl}`);
    
    return new Promise((resolve) => {
        const url = new URL('/api', baseUrl);
        const lib = url.protocol === 'https:' ? https : http;
        
        const req = lib.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log(`✅ API响应正常: ${result.message}`);
                        resolve(true);
                    } else {
                        console.log(`❌ API响应异常: ${result.message}`);
                        resolve(false);
                    }
                } catch (error) {
                    console.log(`❌ API响应格式错误: ${error.message}`);
                    console.log(`响应内容: ${data.substring(0, 200)}...`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ API连接失败: ${error.message}`);
            resolve(false);
        });
        
        req.setTimeout(5000, () => {
            console.log(`❌ API请求超时`);
            req.destroy();
            resolve(false);
        });
    });
}

// 学生登录测试
function testStudentLogin(baseUrl) {
    console.log(`\n👨‍🎓 学生登录测试:`);
    
    return new Promise((resolve) => {
        const url = new URL('/api/auth/login', baseUrl);
        const lib = url.protocol === 'https:' ? https : http;
        
        const postData = JSON.stringify({
            identifier: '20230001',
            password: '20230001',
            userType: 'student'
        });
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (res.statusCode === 200 && result.success) {
                        console.log(`✅ 学生登录成功: ${result.data.user.name}`);
                        resolve(true);
                    } else {
                        console.log(`❌ 学生登录失败: ${result.message || '未知错误'}`);
                        console.log(`状态码: ${res.statusCode}`);
                        resolve(false);
                    }
                } catch (error) {
                    console.log(`❌ 学生登录响应解析失败: ${error.message}`);
                    console.log(`响应内容: ${data.substring(0, 500)}...`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ 学生登录请求失败: ${error.message}`);
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

// 前端资源检查
function checkStaticFiles(baseUrl) {
    console.log(`\n📁 静态文件检查:`);
    
    const files = [
        '/js/app.js',
        '/js/notifications.js',
        '/css/style.css'
    ];
    
    return Promise.all(files.map(file => {
        return new Promise((resolve) => {
            const url = new URL(file, baseUrl);
            const lib = url.protocol === 'https:' ? https : http;
            
            const req = lib.get(url, (res) => {
                if (res.statusCode === 200) {
                    console.log(`✅ ${file} - 可访问`);
                    resolve(true);
                } else {
                    console.log(`❌ ${file} - 状态码: ${res.statusCode}`);
                    resolve(false);
                }
            });
            
            req.on('error', () => {
                console.log(`❌ ${file} - 连接失败`);
                resolve(false);
            });
        });
    }));
}

// 主检查函数
async function runChecks() {
    console.log('开始检查...\n');
    
    // 环境变量检查
    const envOk = checkEnvironment();
    
    // 端口检查
    const portOk = await checkPort();
    
    // 获取测试URL
    const baseUrl = process.argv[2] || `http://localhost:${process.env.PORT || 3000}`;
    console.log(`\n🔗 测试目标: ${baseUrl}`);
    
    // API测试
    const apiOk = await testAPI(baseUrl);
    
    // 学生登录测试
    const loginOk = await testStudentLogin(baseUrl);
    
    // 静态文件检查
    const staticOk = await checkStaticFiles(baseUrl);
    const allStaticOk = staticOk.every(result => result);
    
    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 检查结果总结:');
    console.log(`环境变量: ${envOk ? '✅' : '❌'}`);
    console.log(`端口可用: ${portOk ? '✅' : '❌'}`);
    console.log(`API连接: ${apiOk ? '✅' : '❌'}`);
    console.log(`学生登录: ${loginOk ? '✅' : '❌'}`);
    console.log(`静态文件: ${allStaticOk ? '✅' : '❌'}`);
    
    const allOk = envOk && portOk && apiOk && loginOk && allStaticOk;
    
    console.log(`\n${allOk ? '🎉' : '🚨'} 总体状态: ${allOk ? '正常' : '异常'}`);
    
    if (!allOk) {
        console.log('\n🔧 建议修复步骤:');
        if (!envOk) console.log('1. 检查并设置所有必需的环境变量');
        if (!portOk) console.log('2. 释放端口或使用其他端口');
        if (!apiOk) console.log('3. 检查服务器是否正常启动');
        if (!loginOk) console.log('4. 检查数据库连接和用户数据');
        if (!allStaticOk) console.log('5. 检查静态文件路径配置');
    }
    
    process.exit(allOk ? 0 : 1);
}

// 启动检查
if (require.main === module) {
    runChecks().catch(console.error);
}

module.exports = { runChecks };