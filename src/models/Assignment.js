const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  assignedTo: [{
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }]
  }],
  type: {
    type: String,
    enum: ['homework', 'project', 'quiz', 'exam', 'presentation', 'lab'],
    required: true
  },
  format: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    default: 'online'
  },
  questions: [{
    questionNumber: Number,
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching']
    },
    question: String,
    options: [String],
    correctAnswer: String,
    points: {
      type: Number,
      default: 1
    },
    explanation: String
  }],
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  instructions: String,
  totalPoints: {
    type: Number,
    default: 0
  },
  timeLimit: Number,
  attempts: {
    type: Number,
    default: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  lateSubmission: {
    allowed: {
      type: Boolean,
      default: true
    },
    penalty: Number
  },
  grading: {
    type: {
      type: String,
      enum: ['automatic', 'manual', 'hybrid'],
      default: 'manual'
    },
    rubric: [{
      criteria: String,
      levels: [{
        name: String,
        description: String,
        points: Number
      }]
    }]
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  settings: {
    showCorrectAnswers: {
      type: Boolean,
      default: false
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    preventCheating: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// 自动计算总分的中间件
assignmentSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((total, question) => {
      return total + (question.points || 0);
    }, 0);
  }
  next();
});

// 验证总分的中间件
assignmentSchema.pre('save', function(next) {
  if (this.totalPoints < 0) {
    const error = new Error('作业总分不能为负数');
    error.name = 'ValidationError';
    return next(error);
  }
  
  if (this.questions && this.questions.length > 0) {
    const hasInvalidPoints = this.questions.some(q => q.points < 0);
    if (hasInvalidPoints) {
      const error = new Error('题目分数不能为负数');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  
  next();
});

assignmentSchema.index({ course: 1, dueDate: -1 });
assignmentSchema.index({ teacher: 1, createdAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);