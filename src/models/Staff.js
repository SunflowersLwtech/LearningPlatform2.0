const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: {
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
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['principal', 'vice_principal', 'director', 'head_teacher', 'teacher', 'admin'],
    required: true
  },
  department: {
    type: String,
    required: true
  },
  subjects: [{
    type: String
  }],
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  contactInfo: {
    phone: String,
    address: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    field: String
  }],
  employment: {
    hireDate: {
      type: Date,
      default: Date.now
    },
    contractType: {
      type: String,
      enum: ['permanent', 'temporary', 'substitute']
    },
    salary: Number,
    workload: Number
  },
  permissions: {
    canManageStudents: {
      type: Boolean,
      default: false
    },
    canManageGrades: {
      type: Boolean,
      default: false
    },
    canManageSchedule: {
      type: Boolean,
      default: false
    },
    canAccessReports: {
      type: Boolean,
      default: false
    },
    canManageSystem: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
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
  },
  roleHistory: [{
    oldRole: {
      type: String,
      required: true
    },
    newRole: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    changeDate: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: '管理员操作'
    }
  }]
}, {
  timestamps: true
});

staffSchema.index({ staffId: 1 });
staffSchema.index({ email: 1 });
staffSchema.index({ role: 1 });

module.exports = mongoose.model('Staff', staffSchema);