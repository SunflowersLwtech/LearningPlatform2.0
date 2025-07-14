const mongoose = require('mongoose');

const lessonPlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
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
  chapter: String,
  lessonNumber: Number,
  duration: {
    type: Number,
    required: true
  },
  date: Date,
  objectives: [{
    knowledge: String,
    skills: String,
    attitude: String
  }],
  content: {
    introduction: String,
    mainContent: String,
    summary: String,
    homework: String
  },
  teachingMethods: [String],
  resources: [{
    type: {
      type: String,
      enum: ['ppt', 'video', 'audio', 'document', 'image', 'link']
    },
    name: String,
    url: String,
    description: String
  }],
  activities: [{
    name: String,
    description: String,
    duration: Number,
    materials: [String]
  }],
  assessment: {
    formative: [String],
    summative: [String],
    criteria: String
  },
  differentiation: String,
  reflection: {
    whatWorked: String,
    whatToImprove: String,
    studentEngagement: String,
    nextSteps: String
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }],
  status: {
    type: String,
    enum: ['draft', 'reviewed', 'approved', 'completed'],
    default: 'draft'
  },
  reviewComments: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

lessonPlanSchema.index({ course: 1, date: -1 });
lessonPlanSchema.index({ teacher: 1, date: -1 });

module.exports = mongoose.model('LessonPlan', lessonPlanSchema);