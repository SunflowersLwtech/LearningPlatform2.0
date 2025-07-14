const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'creatorModel'
  },
  creatorModel: {
    type: String,
    required: true,
    enum: ['Staff', 'Student']
  },
  type: {
    type: String,
    enum: ['general', 'assignment', 'announcement', 'qa', 'group_work'],
    default: 'general'
  },
  category: String,
  tags: [String],
  posts: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'posts.authorModel'
    },
    authorModel: {
      type: String,
      required: true,
      enum: ['Staff', 'Student']
    },
    content: {
      type: String,
      required: true
    },
    attachments: {
      type: mongoose.Schema.Types.Mixed,
      default: []
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'posts.likes.userModel'
      },
      userModel: {
        type: String,
        enum: ['Staff', 'Student']
      },
      date: {
        type: Date,
        default: Date.now
      }
    }],
    replies: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'posts.replies.authorModel'
      },
      authorModel: {
        type: String,
        required: true,
        enum: ['Staff', 'Student']
      },
      content: {
        type: String,
        required: true
      },
      attachments: {
        type: mongoose.Schema.Types.Mixed,
        default: []
      },
      date: {
        type: Date,
        default: Date.now
      },
      likes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'posts.replies.likes.userModel'
        },
        userModel: {
          type: String,
          enum: ['Staff', 'Student']
        },
        date: {
          type: Date,
          default: Date.now
        }
      }]
    }],
    isPinned: {
      type: Boolean,
      default: false
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowStudentPosts: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowAnonymous: {
      type: Boolean,
      default: false
    },
    lockAfterDate: Date
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

discussionSchema.index({ course: 1, lastActivity: -1 });
discussionSchema.index({ class: 1, lastActivity: -1 });
discussionSchema.index({ creator: 1 });

module.exports = mongoose.model('Discussion', discussionSchema);