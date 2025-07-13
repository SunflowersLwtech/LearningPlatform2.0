const { Server } = require('socket.io');

let io;
const connectedUsers = new Map(); // 存储连接的用户信息
const roomSubscriptions = new Map(); // 存储房间订阅信息

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('用户已连接:', socket.id);

    // 用户加入房间和实时同步订阅
    socket.on('join-room', (data) => {
      const { userId, userType, classId, role, subscriptions = [] } = data;
      
      // 存储用户连接信息
      connectedUsers.set(socket.id, {
        userId,
        userType,
        classId,
        role,
        connectionTime: new Date(),
        lastActivity: new Date(),
        subscriptions
      });
      
      // 基础房间加入
      socket.join(`user_${userId}`);
      
      if (userType === 'staff') {
        socket.join('staff');
        socket.join(`role_${role}`);
        if (classId) {
          socket.join(`class_${classId}`);
        }
      } else if (userType === 'student') {
        socket.join('students');
        if (classId) {
          socket.join(`class_${classId}`);
        }
      }

      // 处理数据同步订阅
      subscriptions.forEach(sub => {
        const roomName = `sync_${sub.type}_${sub.id}`;
        socket.join(roomName);
        
        // 记录订阅
        if (!roomSubscriptions.has(roomName)) {
          roomSubscriptions.set(roomName, new Set());
        }
        roomSubscriptions.get(roomName).add(socket.id);
      });
      
      console.log(`用户 ${userId} (${userType}) 加入房间，订阅: ${subscriptions.length} 个数据流`);
      
      // 发送连接确认和初始数据
      socket.emit('connection-confirmed', {
        userId,
        userType,
        role,
        serverTime: new Date(),
        activeSubscriptions: subscriptions
      });
    });

    // 订阅特定数据类型的实时更新
    socket.on('subscribe-data', (subscription) => {
      const { type, id, options = {} } = subscription;
      const roomName = `sync_${type}_${id}`;
      
      socket.join(roomName);
      
      if (!roomSubscriptions.has(roomName)) {
        roomSubscriptions.set(roomName, new Set());
      }
      roomSubscriptions.get(roomName).add(socket.id);
      
      console.log(`Socket ${socket.id} 订阅数据流: ${roomName}`);
      
      // 发送当前数据状态
      emitCurrentDataState(socket, type, id, options);
    });

    // 取消订阅
    socket.on('unsubscribe-data', (subscription) => {
      const { type, id } = subscription;
      const roomName = `sync_${type}_${id}`;
      
      socket.leave(roomName);
      
      if (roomSubscriptions.has(roomName)) {
        roomSubscriptions.get(roomName).delete(socket.id);
        if (roomSubscriptions.get(roomName).size === 0) {
          roomSubscriptions.delete(roomName);
        }
      }
      
      console.log(`Socket ${socket.id} 取消订阅数据流: ${roomName}`);
    });

    // 心跳检测
    socket.on('heartbeat', () => {
      if (connectedUsers.has(socket.id)) {
        const user = connectedUsers.get(socket.id);
        user.lastActivity = new Date();
        connectedUsers.set(socket.id, user);
      }
      socket.emit('heartbeat-ack', { serverTime: new Date() });
    });

    // 请求实时数据更新
    socket.on('request-data-update', async (request) => {
      const { type, id, fields } = request;
      try {
        const data = await getCurrentData(type, id, fields);
        socket.emit('data-update', {
          type,
          id,
          data,
          timestamp: new Date(),
          requestId: request.requestId
        });
      } catch (error) {
        socket.emit('data-error', {
          type,
          id,
          error: error.message,
          requestId: request.requestId
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('用户已断开连接:', socket.id);
      
      // 清理用户连接信息
      connectedUsers.delete(socket.id);
      
      // 清理房间订阅
      roomSubscriptions.forEach((subscribers, roomName) => {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          roomSubscriptions.delete(roomName);
        }
      });
    });
  });

  return io;
};

const notifications = {
  // 发送给特定用户
  toUser(userId, message, type = 'info') {
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        type,
        message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // 发送给班级
  toClass(classId, message, type = 'info') {
    if (io) {
      io.to(`class_${classId}`).emit('notification', {
        type,
        message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // 发送给所有教职工
  toStaff(message, type = 'info') {
    if (io) {
      io.to('staff').emit('notification', {
        type,
        message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // 发送给所有学生
  toStudents(message, type = 'info') {
    if (io) {
      io.to('students').emit('notification', {
        type,
        message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // 发送给所有用户
  toAll(message, type = 'info') {
    if (io) {
      io.emit('notification', {
        type,
        message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // 作业相关通知
  assignment: {
    created(assignment, classIds) {
      classIds.forEach(classId => {
        notifications.toClass(classId, `新作业: ${assignment.title}`, 'assignment');
      });
    },

    submitted(assignment, teacherId) {
      notifications.toUser(teacherId, `作业 "${assignment.title}" 有新的提交`, 'submission');
    },

    graded(assignment, studentId, score) {
      notifications.toUser(studentId, `作业 "${assignment.title}" 已批改，得分: ${score}`, 'grade');
    },

    deadline(assignment, classIds) {
      classIds.forEach(classId => {
        notifications.toClass(classId, `作业 "${assignment.title}" 即将截止`, 'warning');
      });
    }
  },

  // 成绩相关通知
  grade: {
    updated(studentId, courseName, grade) {
      notifications.toUser(studentId, `${courseName} 成绩已更新: ${grade}`, 'grade');
    }
  },

  // 考勤相关通知
  attendance: {
    absent(studentId, courseName, date) {
      notifications.toUser(studentId, `您在 ${date} 的 ${courseName} 课程被记录为缺勤`, 'warning');
    }
  },

  // 讨论相关通知
  discussion: {
    newPost(discussionTitle, classId, authorName) {
      notifications.toClass(classId, `${authorName} 在 "${discussionTitle}" 中发表了新内容`, 'discussion');
    },

    newReply(discussionTitle, userId, authorName) {
      notifications.toUser(userId, `${authorName} 回复了您在 "${discussionTitle}" 中的发言`, 'discussion');
    }
  },

  // 系统通知
  system: {
    maintenance(message) {
      notifications.toAll(message, 'system');
    },

    announcement(message, targetType = 'all') {
      switch (targetType) {
        case 'staff':
          notifications.toStaff(message, 'announcement');
          break;
        case 'students':
          notifications.toStudents(message, 'announcement');
          break;
        default:
          notifications.toAll(message, 'announcement');
      }
    }
  }
};

// 辅助函数

/**
 * 发送当前数据状态
 */
async function emitCurrentDataState(socket, type, id, options = {}) {
  try {
    const data = await getCurrentData(type, id, options.fields);
    socket.emit('data-state', {
      type,
      id,
      data,
      timestamp: new Date(),
      isInitial: true
    });
  } catch (error) {
    socket.emit('data-error', {
      type,
      id,
      error: error.message,
      isInitial: true
    });
  }
}

/**
 * 获取当前数据
 */
async function getCurrentData(type, id, fields) {
  let model;
  
  switch (type) {
    case 'student':
      model = require('../models/Student');
      break;
    case 'class':
      model = require('../models/Class');
      break;
    case 'course':
      model = require('../models/Course');
      break;
    case 'assignment':
      model = require('../models/Assignment');
      break;
    case 'grade':
      model = require('../models/Grade');
      break;
    default:
      throw new Error(`不支持的数据类型: ${type}`);
  }
  
  let query = model.findById(id);
  
  // 根据类型添加population
  switch (type) {
    case 'student':
      query = query.populate('class', 'name grade').select('-password');
      break;
    case 'class':
      query = query.populate('headTeacher', 'name').populate('students', 'name studentId');
      break;
    case 'course':
      query = query.populate('teacher', 'name').populate('enrolledClasses', 'name grade');
      break;
    case 'assignment':
      query = query.populate('teacher', 'name').populate('course', 'name');
      break;
    case 'grade':
      query = query.populate('student', 'name studentId').populate('course', 'name');
      break;
  }
  
  // 字段选择
  if (fields && Array.isArray(fields)) {
    query = query.select(fields.join(' '));
  }
  
  const data = await query.exec();
  if (!data) {
    throw new Error('数据不存在');
  }
  
  return data;
}

// 增强的通知系统
const enhancedNotifications = {
  ...notifications,
  
  // 实时数据同步通知
  dataSync: {
    /**
     * 广播数据更新
     */
    broadcastDataUpdate(type, id, data, operation = 'update', metadata = {}) {
      if (!io) {return;}
      
      const roomName = `sync_${type}_${id}`;
      const updateData = {
        type,
        id,
        operation, // 'create', 'update', 'delete'
        data,
        timestamp: new Date(),
        metadata
      };
      
      io.to(roomName).emit('data-sync', updateData);
      console.log(`广播数据更新: ${roomName}, 操作: ${operation}`);
    },

    /**
     * 广播批量数据更新
     */
    broadcastBatchUpdate(type, updates, operation = 'batch_update', metadata = {}) {
      if (!io || !Array.isArray(updates)) {return;}
      
      const batchData = {
        type,
        operation,
        updates: updates.map(update => ({
          id: update.id,
          data: update.data,
          changes: update.changes || {}
        })),
        count: updates.length,
        timestamp: new Date(),
        metadata
      };
      
      // 广播到所有相关订阅者
      updates.forEach(update => {
        const roomName = `sync_${type}_${update.id}`;
        io.to(roomName).emit('data-sync', {
          ...batchData,
          id: update.id,
          data: update.data,
          changes: update.changes
        });
      });
      
      // 也广播到类型级别的房间
      io.to(`sync_${type}_all`).emit('batch-data-sync', batchData);
      
      console.log(`广播批量数据更新: ${type}, ${updates.length} 条记录`);
    },

    /**
     * 广播状态变更
     */
    broadcastStatusChange(type, id, oldStatus, newStatus, metadata = {}) {
      if (!io) {return;}
      
      const statusData = {
        type,
        id,
        operation: 'status_change',
        oldStatus,
        newStatus,
        timestamp: new Date(),
        metadata
      };
      
      const roomName = `sync_${type}_${id}`;
      io.to(roomName).emit('status-change', statusData);
      
      console.log(`广播状态变更: ${roomName}, ${oldStatus} -> ${newStatus}`);
    },

    /**
     * 广播关联数据变更
     */
    broadcastRelationshipChange(type, id, relationshipType, relatedData, operation, metadata = {}) {
      if (!io) {return;}
      
      const relationData = {
        type,
        id,
        operation: 'relationship_change',
        relationshipType, // 'student_class', 'course_enrollment', etc.
        relatedData,
        changeOperation: operation, // 'add', 'remove', 'update'
        timestamp: new Date(),
        metadata
      };
      
      const roomName = `sync_${type}_${id}`;
      io.to(roomName).emit('relationship-change', relationData);
      
      // 也通知相关实体
      if (relatedData.id) {
        const relatedRoomName = `sync_${relatedData.type}_${relatedData.id}`;
        io.to(relatedRoomName).emit('relationship-change', {
          ...relationData,
          isInverse: true
        });
      }
      
      console.log(`广播关联变更: ${roomName}, ${relationshipType} ${operation}`);
    }
  },

  // 系统状态通知
  systemStatus: {
    /**
     * 广播连接统计
     */
    broadcastConnectionStats() {
      if (!io) {return;}
      
      const stats = {
        totalConnections: connectedUsers.size,
        activeRooms: roomSubscriptions.size,
        userTypes: {},
        timestamp: new Date()
      };
      
      // 统计用户类型
      connectedUsers.forEach(user => {
        const key = user.userType;
        stats.userTypes[key] = (stats.userTypes[key] || 0) + 1;
      });
      
      io.to('staff').emit('system-stats', stats);
    },

    /**
     * 广播服务器状态
     */
    broadcastServerStatus(status, message = '') {
      if (!io) {return;}
      
      io.emit('server-status', {
        status, // 'healthy', 'warning', 'error', 'maintenance'
        message,
        timestamp: new Date(),
        connectionCount: connectedUsers.size
      });
    }
  },

  // 实时协作通知
  collaboration: {
    /**
     * 广播用户正在编辑
     */
    broadcastUserEditing(type, id, userId, userName, field = null) {
      if (!io) {return;}
      
      const roomName = `sync_${type}_${id}`;
      io.to(roomName).emit('user-editing', {
        type,
        id,
        userId,
        userName,
        field,
        timestamp: new Date()
      });
    },

    /**
     * 广播用户停止编辑
     */
    broadcastUserStoppedEditing(type, id, userId) {
      if (!io) {return;}
      
      const roomName = `sync_${type}_${id}`;
      io.to(roomName).emit('user-stopped-editing', {
        type,
        id,
        userId,
        timestamp: new Date()
      });
    },

    /**
     * 广播冲突检测
     */
    broadcastConflictDetected(type, id, conflictingUsers, field) {
      if (!io) {return;}
      
      const roomName = `sync_${type}_${id}`;
      io.to(roomName).emit('edit-conflict', {
        type,
        id,
        conflictingUsers,
        field,
        timestamp: new Date()
      });
    }
  }
};

// 通用的发射函数，支持更灵活的通知
function emitNotification(targetType, targetId, notificationData) {
  if (!io) {return;}
  
  let roomName;
  
  switch (targetType) {
    case 'user':
      roomName = `user_${targetId}`;
      break;
    case 'class':
      roomName = `class_${targetId}`;
      break;
    case 'role':
      roomName = `role_${targetId}`;
      break;
    case 'sync':
      roomName = `sync_${targetId}`;
      break;
    default:
      roomName = targetId;
  }
  
  io.to(roomName).emit('notification', {
    ...notificationData,
    timestamp: notificationData.timestamp || new Date()
  });
}

// 获取连接统计信息
function getConnectionStats() {
  const stats = {
    totalConnections: connectedUsers.size,
    activeRooms: roomSubscriptions.size,
    userTypes: {},
    roomStats: {},
    connectionDetails: []
  };
  
  // 统计用户类型
  connectedUsers.forEach((user, socketId) => {
    const key = user.userType;
    stats.userTypes[key] = (stats.userTypes[key] || 0) + 1;
    
    stats.connectionDetails.push({
      socketId,
      userId: user.userId,
      userType: user.userType,
      role: user.role,
      connectionTime: user.connectionTime,
      lastActivity: user.lastActivity,
      subscriptionCount: user.subscriptions.length
    });
  });
  
  // 统计房间
  roomSubscriptions.forEach((subscribers, roomName) => {
    stats.roomStats[roomName] = subscribers.size;
  });
  
  return stats;
}

module.exports = {
  initializeSocket,
  notifications: enhancedNotifications,
  emitNotification,
  getConnectionStats,
  connectedUsers,
  roomSubscriptions
};