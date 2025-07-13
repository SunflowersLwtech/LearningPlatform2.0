const rateLimitMap = new Map();
const MAX_MAP_SIZE = 10000; // 限制Map最大大小，防止内存泄漏
let cleanupInterval;

const rateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  // 测试环境下放宽限制
  if (process.env.NODE_ENV === 'test' || process.env.TESTING === 'true') {
    windowMs = 1 * 60 * 1000; // 1分钟窗口
    max = 1000; // 提高到1000次请求
  }
  return (req, res, next) => {
    // 获取客户端标识符（优先使用真实IP）
    const key = req.headers['x-forwarded-for']?.split(',')[0] || 
                req.headers['x-real-ip'] || 
                req.ip || 
                req.connection.remoteAddress ||
                'unknown';
    
    const now = Date.now();
    
    // 检查Map大小，防止内存泄漏
    if (rateLimitMap.size > MAX_MAP_SIZE) {
      console.warn(`限流器Map大小超过限制 (${rateLimitMap.size}), 执行紧急清理`);
      cleanupExpiredEntries();
      
      // 如果清理后仍然过大，删除最旧的条目
      if (rateLimitMap.size > MAX_MAP_SIZE) {
        const keysToDelete = Array.from(rateLimitMap.keys()).slice(0, rateLimitMap.size - MAX_MAP_SIZE + 1000);
        keysToDelete.forEach(k => rateLimitMap.delete(k));
      }
    }
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { 
        count: 1, 
        resetTime: now + windowMs,
        firstRequest: now
      });
      return next();
    }
    
    const limit = rateLimitMap.get(key);
    
    // 重置计数器
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      limit.firstRequest = now;
      return next();
    }
    
    // 检查是否超过限制
    if (limit.count >= max) {
      // 记录潜在的恶意请求
      if (limit.count > max * 2) {
        console.warn(`可疑的高频请求来自 ${key}: ${limit.count} 次请求`);
      }
      
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((limit.resetTime - now) / 1000),
        limit: max,
        remaining: 0
      });
    }
    
    limit.count++;
    
    // 添加限流信息到响应头
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - limit.count),
      'X-RateLimit-Reset': new Date(limit.resetTime).toISOString()
    });
    
    next();
  };
};

// 清理过期条目的函数
function cleanupExpiredEntries() {
  const now = Date.now();
  let deletedCount = 0;
  
  for (const [key, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(key);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`限流器清理: 删除了 ${deletedCount} 个过期条目，当前大小: ${rateLimitMap.size}`);
  }
}

// 设置更频繁的清理间隔，避免内存累积
cleanupInterval = setInterval(cleanupExpiredEntries, 60 * 1000); // 每分钟清理一次

// 优雅关闭时清理定时器
process.on('SIGTERM', () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
});

process.on('SIGINT', () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
});

module.exports = rateLimiter;