const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Discussion = require('../models/Discussion');
const Resource = require('../models/Resource');
const { uploadMiddleware } = require('../middleware/upload');
const mongoose = require('mongoose');

exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const pendingAssignments = await Assignment.find({
      'assignedTo.students': studentId,
      dueDate: { $gte: new Date() },
      isPublished: true
    })
    .populate('course', 'name subject')
    .sort({ dueDate: 1 })
    .limit(5);
    
    const recentSubmissions = await Submission.find({
      student: studentId,
      status: { $in: ['graded', 'returned'] }
    })
    .populate('assignment', 'title type')
    .sort({ gradedAt: -1 })
    .limit(5);
    
    const activeDiscussions = await Discussion.find({
      $or: [
        { class: req.user.class },
        { 'course': { $in: req.user.enrolledCourses || [] } }
      ],
      isActive: true
    })
    .sort({ lastActivity: -1 })
    .limit(5);
    
    res.json({
      success: true,
      data: {
        pendingAssignments,
        recentSubmissions,
        activeDiscussions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取学生面板失败',
      error: error.message
    });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { status, course, page = 1, limit = 10 } = req.query;
    
    const filter = {
      'assignedTo.students': studentId,
      isPublished: true
    };
    
    if (course) {filter.course = course;}
    if (status === 'pending') {
      filter.dueDate = { $gte: new Date() };
    } else if (status === 'overdue') {
      filter.dueDate = { $lt: new Date() };
    }
    
    const assignments = await Assignment.find(filter)
      .populate('course', 'name subject')
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const assignmentsWithSubmissions = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await Submission.findOne({
          assignment: assignment._id,
          student: studentId
        });
        
        return {
          ...assignment.toObject(),
          submission: submission || null
        };
      })
    );
    
    res.json({
      success: true,
      data: assignmentsWithSubmissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取作业列表失败',
      error: error.message
    });
  }
};

exports.submitAssignment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.id;
    const { answers, textSubmission } = req.body;
    
    // 获取学生信息用于权限验证
    const student = await Student.findOne({ _id: studentId }).session(session);
    if (!student) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: '学生信息不存在'
      });
    }
    
    const assignment = await Assignment.findById(assignmentId)
      .populate('assignedTo.classes assignedTo.students')
      .session(session);
    if (!assignment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '作业不存在'
      });
    }
    
    // 验证学生是否被分配了该作业
    const isAssigned = assignment.assignedTo.some(assigned => {
      // 检查是否直接分配给学生
      if (assigned.students && assigned.students.some(s => s._id.toString() === studentId)) {
        return true;
      }
      // 检查是否通过班级分配
      if (assigned.classes && assigned.classes.some(cls => 
        cls._id.toString() === student.class?.toString())) {
        return true;
      }
      return false;
    });
    
    if (!isAssigned) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: '您未被分配此作业'
      });
    }
    
    if (new Date() > assignment.dueDate) {
      if (!assignment.lateSubmission.allowed) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: '作业已过期，不允许提交'
        });
      }
    }
    
    let submission = await Submission.findOne({
      assignment: assignmentId,
      student: studentId
    }).session(session);
    
    if (submission && submission.attemptNumber >= assignment.attempts) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '已达到最大提交次数'
      });
    }
    
    const isLate = new Date() > assignment.dueDate;
    const submittedAt = new Date();
    
    // 验证提交内容
    if (!answers && !textSubmission && (!req.files || req.files.length === 0)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '请提交作业内容'
      });
    }
    
    // 处理上传的文件
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimeType: file.mimetype
        });
      });
    }

    if (submission) {
      const updatedSubmission = await Submission.findOneAndUpdate(
        { 
          assignment: assignmentId,
          student: studentId,
          attemptNumber: { $lt: assignment.attempts }
        },
        {
          $inc: { attemptNumber: 1 },
          $set: {
            answers: answers || null,
            textSubmission: textSubmission || null,
            attachments,
            submittedAt,
            isLate,
            status: 'submitted'
          }
        },
        { 
          new: true,
          session,
          runValidators: true
        }
      );
      
      if (!updatedSubmission) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: '已达到最大提交次数'
        });
      }
      
      submission = updatedSubmission;
    } else {
      submission = new Submission({
        assignment: assignmentId,
        student: studentId,
        answers: answers || null,
        textSubmission: textSubmission || null,
        attachments,
        isLate,
        submittedAt,
        status: 'submitted',
        attemptNumber: 1
      });
      
      await submission.save({ session });
    }
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: '作业提交成功',
      data: submission
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      message: '提交作业失败',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

exports.getResources = async (req, res) => {
  try {
    const { subject, grade, type, search, page = 1, limit = 12 } = req.query;
    
    const filter = { 
      isActive: true,
      accessLevel: { $in: ['public', 'school'] }
    };
    
    if (subject) {filter.subject = subject;}
    if (grade) {filter.grade = grade;}
    if (type) {filter.type = type;}
    if (search) {
      filter.$text = { $search: search };
    }
    
    const resources = await Resource.find(filter)
      .populate('uploadedBy', 'name')
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Resource.countDocuments(filter);
    
    res.json({
      success: true,
      data: resources,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取资源失败',
      error: error.message
    });
  }
};

exports.downloadResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: '资源不存在'
      });
    }
    
    // 检查文件是否存在
    const path = require('path');
    const fs = require('fs');
    
    if (resource.fileInfo && resource.fileInfo.filePath) {
      const uploadsDir = path.resolve('./uploads');
      
      // 修复文件路径 - 处理重复的uploads前缀和Windows路径分隔符
      let cleanFilePath = resource.fileInfo.filePath;
      
      // 处理Windows路径分隔符
      cleanFilePath = cleanFilePath.replace(/\\/g, '/');
      
      // 移除重复的uploads前缀
      if (cleanFilePath.startsWith('uploads/')) {
        cleanFilePath = cleanFilePath.substring('uploads/'.length);
      }
      
      // 确保路径以resources/开头
      if (!cleanFilePath.startsWith('resources/')) {
        cleanFilePath = 'resources/' + cleanFilePath;
      }
      
      const requestedPath = path.resolve(uploadsDir, cleanFilePath);
      
      // 强化路径遍历攻击防护
      const normalizedUploadsDir = path.normalize(uploadsDir);
      const normalizedRequestedPath = path.normalize(requestedPath);
      
      if (!normalizedRequestedPath.startsWith(normalizedUploadsDir)) {
        console.warn(`路径遍历攻击尝试: ${resource.fileInfo.filePath} -> ${requestedPath}`);
        return res.status(403).json({
          success: false,
          message: '无效的文件路径'
        });
      }
      
      // 额外检查：禁止包含路径遍历字符
      if (cleanFilePath.includes('..') || cleanFilePath.includes('~')) {
        console.warn(`检测到可疑路径字符: ${cleanFilePath}`);
        return res.status(403).json({
          success: false,
          message: '文件路径包含非法字符'
        });
      }
      
      const filePath = normalizedRequestedPath;
      
      console.log(`资源下载调试: 原始路径=${resource.fileInfo.filePath}, 清理后=${cleanFilePath}, 最终路径=${filePath}`);
      
      if (fs.existsSync(filePath)) {
        // 增加下载计数
        resource.downloads += 1;
        await resource.save();
        
        // 设置响应头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.fileInfo.originalName || resource.title)}"`);
        res.setHeader('Content-Type', resource.fileInfo.mimeType || 'application/octet-stream');
        
        // 创建文件流并发送
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        return;
      }
    }
    
    // 如果文件不存在或没有文件信息，返回错误
    return res.status(404).json({
      success: false,
      message: '文件不存在或已被删除'
    });
    
  } catch (error) {
    console.error('下载资源失败:', error);
    res.status(500).json({
      success: false,
      message: '下载资源失败',
      error: error.message
    });
  }
};

exports.getDiscussionById = async (req, res) => {
  try {
    const discussionId = req.params.id;
    
    const discussion = await Discussion.findById(discussionId)
      .populate('creator', 'name')
      .populate('course', 'name')
      .populate('class', 'name')
      .populate({
        path: 'posts.author',
        select: 'name'
      })
      .populate({
        path: 'posts.replies.author',
        select: 'name'
      });
    
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在'
      });
    }
    
    res.json({
      success: true,
      data: discussion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取讨论详情失败',
      error: error.message
    });
  }
};

exports.getDiscussions = async (req, res) => {
  try {
    const { course, class: classId, type, page = 1, limit = 10 } = req.query;
    
    const filter = { 
      isActive: true,
      isLocked: false
    };
    
    if (course) {filter.course = course;}
    if (classId) {filter.class = classId;}
    if (type) {filter.type = type;}
    
    const discussions = await Discussion.find(filter)
      .populate('creator', 'name')
      .populate('course', 'name')
      .populate('class', 'name')
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      success: true,
      data: discussions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取讨论列表失败',
      error: error.message
    });
  }
};

exports.participateInDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content, replyTo } = req.body;
    const userId = req.user.id;
    const userModel = req.user.role ? 'Staff' : 'Student';

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在'
      });
    }

    if (discussion.isLocked) {
      return res.status(400).json({
        success: false,
        message: '讨论已锁定'
      });
    }

    // 处理文件上传
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/general/${file.filename}`,
        type: file.mimetype
      }));
    }

    if (replyTo) {
      const post = discussion.posts.id(replyTo);
      if (post) {
        post.replies.push({
          author: userId,
          authorModel: userModel,
          content,
          attachments,
          date: new Date()
        });
      }
    } else {
      discussion.posts.push({
        author: userId,
        authorModel: userModel,
        content,
        attachments
      });
    }

    discussion.lastActivity = new Date();
    await discussion.save();

    res.json({
      success: true,
      message: '参与讨论成功',
      data: discussion
    });
  } catch (error) {
    console.error('参与讨论失败:', error);
    res.status(400).json({
      success: false,
      message: '参与讨论失败',
      error: error.message
    });
  }
};

exports.uploadResource = async (req, res) => {
  try {
    const { title, description, subject, grade, type, accessLevel, featured } = req.body;
    const uploadedBy = req.user.id;
    const userModel = req.user.role ? 'Staff' : 'Student';
    
    // 验证必填字段
    if (!title) {
      return res.status(400).json({
        success: false,
        message: '资源标题不能为空'
      });
    }
    
    let fileInfo = {};
    if (req.file) {
      fileInfo = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      };
    }
    
    const resource = new Resource({
      title,
      description: description || '',
      subject: subject || 'general',
      grade: grade || 'all',
      type: type || 'document',
      accessLevel: accessLevel || 'public',
      featured: featured === 'true' || featured === true,
      uploadedBy,
      uploaderModel: userModel,
      fileInfo,
      isActive: true,
      downloads: 0,
      views: 0
    });
    
    await resource.save();
    
    res.status(201).json({
      success: true,
      message: '资源上传成功',
      data: resource
    });
  } catch (error) {
    console.error('资源上传失败:', error);
    res.status(400).json({
      success: false,
      message: '资源上传失败',
      error: error.message
    });
  }
};

exports.createDiscussion = async (req, res) => {
  try {
    const { title, content, type, course, class: classId } = req.body;
    const creator = req.user.id;
    const creatorModel = req.user.role ? 'Staff' : 'Student';
    
    // 验证必填字段
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: '标题和内容不能为空'
      });
    }
    
    const discussion = new Discussion({
      title,
      content,
      type: type || 'general',
      creator,
      creatorModel,
      course: course || null,
      class: classId || null,
      posts: [],
      isActive: true,
      isLocked: false,
      isPinned: false,
      lastActivity: new Date()
    });
    
    await discussion.save();
    
    // 填充creator信息用于返回
    await discussion.populate('creator', 'name');
    if (discussion.course) {
      await discussion.populate('course', 'name');
    }
    if (discussion.class) {
      await discussion.populate('class', 'name');
    }
    
    res.status(201).json({
      success: true,
      message: '讨论创建成功',
      data: discussion
    });
  } catch (error) {
    console.error('创建讨论失败:', error);
    res.status(400).json({
      success: false,
      message: '创建讨论失败',
      error: error.message
    });
  }
};