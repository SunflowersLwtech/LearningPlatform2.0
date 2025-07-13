const { body, param, query, validationResult } = require('express-validator');

exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

exports.validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('用户名/学号不能为空')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6 })
    .withMessage('密码至少6位'),
  body('userType')
    .isIn(['staff', 'student'])
    .withMessage('用户类型必须是staff或student')
];

exports.validateStudentCreate = [
  body('studentId')
    .notEmpty()
    .withMessage('学号不能为空')
    .isLength({ min: 8, max: 20 })
    .withMessage('学号长度应在8-20位之间')
    .trim(),
  body('name')
    .notEmpty()
    .withMessage('姓名不能为空')
    .isLength({ max: 50 })
    .withMessage('姓名不能超过50个字符')
    .trim(),
  body('gender')
    .isIn(['male', 'female'])
    .withMessage('性别必须是male或female'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('出生日期格式不正确'),
  body('grade')
    .notEmpty()
    .withMessage('年级不能为空'),
  body('class')
    .isMongoId()
    .withMessage('班级ID格式不正确')
];

// 通用注册验证
exports.validateRegister = [
  body('userType')
    .isIn(['staff', 'student'])
    .withMessage('用户类型必须是staff或student'),
  body('name')
    .notEmpty()
    .withMessage('姓名不能为空')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6位'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('确认密码与密码不匹配');
      }
      return true;
    }),

  // 条件验证：如果是员工，验证员工字段
  body('staffId')
    .if(body('userType').equals('staff'))
    .notEmpty()
    .withMessage('工号不能为空')
    .trim(),
  body('role')
    .if(body('userType').equals('staff'))
    .isIn(['head_teacher', 'teacher'])
    .withMessage('只能注册为教师或班主任'),
  body('department')
    .if(body('userType').equals('staff'))
    .notEmpty()
    .withMessage('部门不能为空')
    .trim(),

  // 条件验证：如果是学生，验证学生字段
  body('studentId')
    .if(body('userType').equals('student'))
    .notEmpty()
    .withMessage('学号不能为空')
    .trim(),
  body('grade')
    .if(body('userType').equals('student'))
    .notEmpty()
    .withMessage('年级不能为空'),
  body('gender')
    .if(body('userType').equals('student'))
    .isIn(['male', 'female'])
    .withMessage('性别必须是male或female')
];

exports.validateStaffCreate = [
  body('staffId')
    .notEmpty()
    .withMessage('工号不能为空')
    .trim(),
  body('name')
    .notEmpty()
    .withMessage('姓名不能为空')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6位'),
  body('role')
    .isIn(['principal', 'vice_principal', 'director', 'head_teacher', 'teacher', 'admin'])
    .withMessage('角色不正确'),
  body('department')
    .notEmpty()
    .withMessage('部门不能为空')
];

exports.validateAssignmentCreate = [
  body('title')
    .notEmpty()
    .withMessage('作业标题不能为空')
    .isLength({ max: 200 })
    .withMessage('标题不能超过200个字符')
    .trim(),
  body('course')
    .isMongoId()
    .withMessage('课程ID格式不正确'),
  body('type')
    .isIn(['homework', 'project', 'quiz', 'exam', 'presentation', 'lab'])
    .withMessage('作业类型不正确'),
  body('startDate')
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  body('dueDate')
    .isISO8601()
    .withMessage('截止日期格式不正确')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('截止日期必须晚于开始日期');
      }
      return true;
    })
];

exports.validateClassCreate = [
  body('classId')
    .notEmpty()
    .withMessage('班级编号不能为空')
    .trim(),
  body('name')
    .notEmpty()
    .withMessage('班级名称不能为空')
    .trim(),
  body('grade')
    .notEmpty()
    .withMessage('年级不能为空'),
  body('academicYear')
    .notEmpty()
    .withMessage('学年不能为空')
    .matches(/^\d{4}$/)
    .withMessage('学年格式不正确(如2023)'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('班级容量应在1-100之间')
];

exports.validateCourseCreate = [
  body('courseId')
    .notEmpty()
    .withMessage('课程编号不能为空')
    .trim(),
  body('name')
    .notEmpty()
    .withMessage('课程名称不能为空')
    .trim(),
  body('subject')
    .notEmpty()
    .withMessage('学科不能为空'),
  body('grade')
    .notEmpty()
    .withMessage('年级不能为空'),
  body('semester')
    .isIn(['spring', 'fall', 'summer'])
    .withMessage('学期必须是spring、fall或summer'),
  body('academicYear')
    .notEmpty()
    .withMessage('学年不能为空')
];

exports.validateGradeSubmission = [
  body('score')
    .isFloat({ min: 0 })
    .withMessage('分数不能为负数'),
  body('maxScore')
    .isFloat({ min: 1 })
    .withMessage('总分必须大于0'),
  body('comments')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('评语不能超过1000个字符')
];

exports.validateIdParam = [
  param('id')
    .isMongoId()
    .withMessage('ID格式不正确')
];

exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量应在1-100之间')
];