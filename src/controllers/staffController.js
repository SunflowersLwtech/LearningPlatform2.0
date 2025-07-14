const Staff = require('../models/Staff');
const bcrypt = require('bcryptjs');
const { createError, sendSuccessResponse, sendErrorResponse } = require('../utils/errorHandler');

// 获取当前员工信息
exports.getCurrentStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.user._id)
      .select('-password')
      .populate('permissions');
    
    if (!staff) {
      return sendErrorResponse(res, createError.notFound('员工信息不存在'));
    }
    
    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    sendErrorResponse(res, createError.internal('获取员工信息失败'));
  }
};

// 获取所有员工
exports.getAllStaff = async (req, res) => {
  try {
    const { page = 1, limit = 20, department, role, search } = req.query;
    
    const filter = {};
    if (department) {filter.department = department;}
    if (role) {filter.role = role;}
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchConditions = [
        { name: { $regex: searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { staffId: { $regex: searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { email: { $regex: searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      ];
      
      // 如果搜索词匹配部门或角色，添加精确匹配
      if (searchTerm.includes('系') || searchTerm.includes('部门')) {
        searchConditions.push({ department: { $regex: searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
      }
      
      filter.$or = searchConditions;
    }
    
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const staff = await Staff.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('permissions');
    
    const total = await Staff.countDocuments(filter);
    
    res.json({
      success: true,
      data: staff,
      pagination: {
        current: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        total
      }
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    sendErrorResponse(res, createError.internal('获取员工列表失败'));
  }
};

// 根据ID获取员工
exports.getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .select('-password')
      .populate('permissions');
    
    if (!staff) {
      return sendErrorResponse(res, createError.notFound('员工不存在'));
    }
    
    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    sendErrorResponse(res, createError.internal('获取员工信息失败'));
  }
};

// 创建员工
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, staffId, role, department, phone } = req.body;
    
    // 验证必填字段
    if (!name || !email || !password || !staffId || !role) {
      return sendErrorResponse(res, createError.badRequest('请填写所有必填字段'));
    }
    
    // 检查是否已存在
    const existingStaff = await Staff.findOne({
      $or: [{ email }, { staffId }]
    });
    
    if (existingStaff) {
      return sendErrorResponse(res, createError.conflict('邮箱或工号已存在'));
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const staff = new Staff({
      name,
      email,
      password: hashedPassword,
      staffId,
      role,
      department: department || '未分配',
      phone: phone || ''
    });
    
    await staff.save();
    
    // 返回时不包含密码
    const staffData = await Staff.findById(staff._id).select('-password');
    
    res.status(201).json({
      success: true,
      message: '员工创建成功',
      data: staffData
    });
  } catch (error) {
    console.error('创建员工失败:', error);
    sendErrorResponse(res, createError.internal('创建员工失败'));
  }
};

// 更新员工信息
exports.updateStaff = async (req, res) => {
  try {
    const { name, email, department, phone } = req.body;
    
    const updateData = {};
    if (name) {updateData.name = name;}
    if (email) {updateData.email = email;}
    if (department) {updateData.department = department;}
    if (phone !== undefined) {updateData.phone = phone;}
    
    // 如果更新邮箱，检查是否重复
    if (email) {
      const existingStaff = await Staff.findOne({
        email,
        _id: { $ne: req.params.id }
      });
      
      if (existingStaff) {
        return sendErrorResponse(res, createError.conflict('邮箱已被其他员工使用'));
      }
    }
    
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!staff) {
      return sendErrorResponse(res, createError.notFound('员工不存在'));
    }
    
    res.json({
      success: true,
      message: '员工信息更新成功',
      data: staff
    });
  } catch (error) {
    console.error('更新员工失败:', error);
    sendErrorResponse(res, createError.internal('更新员工失败'));
  }
};

// 删除员工
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    
    if (!staff) {
      return sendErrorResponse(res, createError.notFound('员工不存在'));
    }
    
    res.json({
      success: true,
      message: '员工删除成功'
    });
  } catch (error) {
    console.error('删除员工失败:', error);
    sendErrorResponse(res, createError.internal('删除员工失败'));
  }
};

// 更新员工角色
exports.updateStaffRole = async (req, res) => {
  try {
    const { role, reason } = req.body;
    
    if (!role) {
      return sendErrorResponse(res, createError.badRequest('请提供新角色'));
    }
    
    const staff = await Staff.findById(req.params.id);
    
    if (!staff) {
      return sendErrorResponse(res, createError.notFound('员工不存在'));
    }
    
    const oldRole = staff.role;
    
    // 记录角色变更历史
    staff.roleHistory.push({
      oldRole,
      newRole: role,
      changedBy: req.user._id,
      reason: reason || '管理员操作'
    });
    
    staff.role = role;
    await staff.save();
    
    res.json({
      success: true,
      message: '员工角色更新成功',
      data: {
        staffId: staff.staffId,
        name: staff.name,
        oldRole,
        newRole: role
      }
    });
  } catch (error) {
    console.error('更新员工角色失败:', error);
    sendErrorResponse(res, createError.internal('更新员工角色失败'));
  }
};

// 按部门获取员工
exports.getStaffByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    
    const staff = await Staff.find({ department })
      .select('-password')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('获取部门员工失败:', error);
    sendErrorResponse(res, createError.internal('获取部门员工失败'));
  }
};
