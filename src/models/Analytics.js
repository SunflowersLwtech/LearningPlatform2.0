const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['student_performance', 'class_performance', 'course_analytics', 'attendance_summary', 'grade_distribution'],
    required: true
  },
  scope: {
    entity: {
      type: String,
      enum: ['student', 'class', 'course', 'grade', 'school'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    semester: String,
    academicYear: String
  },
  metrics: {
    attendance: {
      totalDays: Number,
      presentDays: Number,
      absentDays: Number,
      tardyDays: Number,
      attendanceRate: Number
    },
    academic: {
      averageScore: Number,
      gradeDistribution: {
        A: Number,
        B: Number,
        C: Number,
        D: Number,
        F: Number
      },
      subjectPerformance: [{
        subject: String,
        averageScore: Number,
        trend: String,
        improvement: Number
      }],
      gpa: Number,
      rank: Number,
      totalStudents: Number
    },
    engagement: {
      assignmentsSubmitted: Number,
      assignmentsTotal: Number,
      submissionRate: Number,
      discussionPosts: Number,
      resourceAccess: Number
    },
    behavior: {
      disciplinaryActions: Number,
      positiveRecognitions: Number,
      extracurricularParticipation: Number
    }
  },
  comparisons: {
    previousPeriod: {
      change: Number,
      trend: String
    },
    classAverage: Number,
    gradeAverage: Number,
    schoolAverage: Number
  },
  insights: [{
    category: String,
    message: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    recommendations: [String]
  }],
  generated: {
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    at: {
      type: Date,
      default: Date.now
    },
    automated: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

analyticsSchema.index({ 'scope.entity': 1, 'scope.entityId': 1 });
analyticsSchema.index({ type: 1, 'period.academicYear': 1 });
analyticsSchema.index({ 'generated.at': -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);