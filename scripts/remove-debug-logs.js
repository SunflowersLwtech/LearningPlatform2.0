#!/usr/bin/env node
/**
 * 生产环境日志清理脚本
 * 移除或替换所有调试console.log语句
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 需要处理的文件模式
const patterns = [
  'src/**/*.js',
  'public/js/*.js',
  '!node_modules/**',
  '!scripts/**'
];

// 需要移除或替换的console方法
const consoleMethods = ['console.log', 'console.debug', 'console.info'];

// 生产环境下的替换映射
const replacements = {
  'console.log': '// Production: console.log removed',
  'console.debug': '// Production: console.debug removed', 
  'console.info': '// Production: console.info removed'
};

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 移除或注释掉console.log语句
    consoleMethods.forEach(method => {
      const regex = new RegExp(`\\s*${method.replace('.', '\\.')}\\([^;]*\\);?`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, ` // ${method} removed for production`);
        modified = true;
      }
    });
    
    // 移除调试注释
    content = content.replace(/\/\/.*调试信息/g, '// Debug info removed');
    content = content.replace(/\/\/.*调试日志/g, '// Debug log removed');
    content = content.replace(/\/\/.*Debug.*$/gm, '// Debug comment removed');
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ 已处理: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ 处理文件失败 ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('开始清理生产环境调试日志...\n');
  
  let totalFiles = 0;
  let processedFiles = 0;
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { cwd: process.cwd() });
    
    files.forEach(file => {
      totalFiles++;
      if (processFile(file)) {
        processedFiles++;
      }
    });
  });
  
  console.log(`\n清理完成！`);
  console.log(`总文件数: ${totalFiles}`);
  console.log(`已处理文件数: ${processedFiles}`);
  
  if (processedFiles > 0) {
    console.log('\n⚠️  建议在部署前测试应用程序以确保功能正常！');
  }
}

// 仅在直接运行时执行
if (require.main === module) {
  main();
}

module.exports = { processFile, main };