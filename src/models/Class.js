const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  classId: {
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
  grade: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  classType: {
    type: String,
    enum: ['administrative', 'teaching'],
    default: 'administrative'
  },
  headTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  subjectTeachers: [{
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    subject: String
  }],
  capacity: {
    type: Number,
    default: 40
  },
  currentEnrollment: {
    type: Number,
    default: 0
  },
  classroom: {
    building: String,
    room: String,
    floor: Number
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    periods: [{
      period: Number,
      subject: String,
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
      },
      startTime: String,
      endTime: String
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

classSchema.index({ classId: 1 });
classSchema.index({ grade: 1 });
classSchema.index({ academicYear: 1 });

module.exports = mongoose.model('Class', classSchema);