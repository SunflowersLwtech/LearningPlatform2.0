const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
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
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false
  },
  contactInfo: {
    phone: String,
    email: String,
    address: String
  },
  familyMembers: [{
    name: String,
    relationship: String,
    phone: String,
    occupation: String
  }],
  enrollmentStatus: {
    type: String,
    enum: ['enrolled', 'transferred', 'suspended', 'graduated', 'dropped'],
    default: 'enrolled'
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  statusHistory: [{
    status: String,
    date: Date,
    reason: String,
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    }
  }],
  medicalInfo: {
    allergies: [String],
    medications: [String],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  academicRecord: {
    previousSchool: String,
    transferCredits: Number,
    academicNotes: String
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  preferredLanguage: {
    type: String,
    enum: ['zh-CN', 'en-US'],
    default: 'zh-CN'
  }
}, {
  timestamps: true
});

studentSchema.index({ studentId: 1 });
studentSchema.index({ name: 1 });
studentSchema.index({ class: 1 });
studentSchema.index({ grade: 1 });
studentSchema.index({ 'contactInfo.email': 1 });

module.exports = mongoose.model('Student', studentSchema);