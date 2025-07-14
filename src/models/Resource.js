const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['document', 'video', 'audio', 'image', 'presentation', 'worksheet', 'test', 'other'],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  grade: String,
  chapter: String,
  topic: String,
  description: String,
  fileInfo: {
    originalName: String,
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String
  },
  url: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  tags: [String],
  category: {
    type: String,
    enum: ['teaching_material', 'exercise', 'reference', 'multimedia', 'assessment']
  },
  accessLevel: {
    type: String,
    enum: ['public', 'school', 'department', 'private'],
    default: 'school'
  },
  downloads: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    rating: Number,
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

resourceSchema.index({ subject: 1, grade: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ tags: 1 });
resourceSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);