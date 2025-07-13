const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    enum: ['spring', 'fall', 'summer'],
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  credits: {
    type: Number,
    default: 1
  },
  description: String,
  objectives: [String],
  curriculum: {
    standard: String,
    chapters: [{
      title: String,
      content: String,
      duration: Number,
      resources: [String]
    }]
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  assistants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }],
  enrolledClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  schedule: [{
    day: String,
    startTime: String,
    endTime: String,
    location: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

courseSchema.index({ courseId: 1 });
courseSchema.index({ subject: 1, grade: 1 });
courseSchema.index({ teacher: 1 });

module.exports = mongoose.model('Course', courseSchema);