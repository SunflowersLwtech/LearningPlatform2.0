const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  },
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  type: {
    type: String,
    enum: ['quiz', 'homework', 'exam', 'project', 'participation', 'attendance', 'final'],
    required: true
  },
  category: {
    type: String,
    enum: ['formative', 'summative'],
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  letterGrade: String,
  gpa: Number,
  weight: {
    type: Number,
    default: 1
  },
  semester: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  gradedAt: {
    type: Date,
    default: Date.now
  },
  comments: String,
  feedback: String,
  rubricScores: [{
    criteria: String,
    score: Number,
    maxScore: Number,
    weight: Number
  }],
  isExcused: {
    type: Boolean,
    default: false
  },
  makeupAllowed: {
    type: Boolean,
    default: false
  },
  makeupDeadline: Date,
  parentNotified: {
    type: Boolean,
    default: false
  },
  notificationDate: Date
}, {
  timestamps: true
});

// 自动计算GPA的中间件
gradeSchema.pre('save', function(next) {
  // 根据百分比计算GPA (4.0制)
  if (this.percentage !== undefined) {
    if (this.percentage >= 97) {this.gpa = 4.0;}
    else if (this.percentage >= 93) {this.gpa = 3.7;}
    else if (this.percentage >= 90) {this.gpa = 3.3;}
    else if (this.percentage >= 87) {this.gpa = 3.0;}
    else if (this.percentage >= 83) {this.gpa = 2.7;}
    else if (this.percentage >= 80) {this.gpa = 2.3;}
    else if (this.percentage >= 77) {this.gpa = 2.0;}
    else if (this.percentage >= 73) {this.gpa = 1.7;}
    else if (this.percentage >= 70) {this.gpa = 1.3;}
    else if (this.percentage >= 67) {this.gpa = 1.0;}
    else if (this.percentage >= 60) {this.gpa = 0.7;}
    else {this.gpa = 0.0;}
  }
  next();
});

// 静态方法：计算学生的累计GPA
gradeSchema.statics.calculateStudentGPA = async function(studentId, academicYear, semester) {
  const filter = { student: studentId };
  if (academicYear) {filter.academicYear = academicYear;}
  if (semester) {filter.semester = semester;}
  
  const grades = await this.find(filter).populate('course', 'credits');
  
  if (grades.length === 0) {return { gpa: 0, totalCredits: 0 };}
  
  let totalGradePoints = 0;
  let totalCredits = 0;
  
  grades.forEach(grade => {
    const credits = grade.course?.credits || 1;
    const gpa = grade.gpa || 0;
    
    totalGradePoints += gpa * credits;
    totalCredits += credits;
  });
  
  const cumulativeGPA = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  
  return {
    gpa: Math.round(cumulativeGPA * 100) / 100,
    totalCredits,
    totalGradePoints
  };
};

gradeSchema.index({ student: 1, course: 1, academicYear: 1 });
gradeSchema.index({ course: 1, type: 1 });
gradeSchema.index({ gradedAt: -1 });

module.exports = mongoose.model('Grade', gradeSchema);