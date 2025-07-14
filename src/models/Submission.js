const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  answers: [{
    questionNumber: Number,
    answer: String,
    attachments: [{
      name: String,
      url: String,
      type: String
    }]
  }],
  textSubmission: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned'],
    default: 'draft'
  },
  grade: {
    score: Number,
    maxScore: Number,
    percentage: Number,
    letterGrade: String,
    comments: String,
    rubricScores: [{
      criteria: String,
      score: Number,
      maxScore: Number,
      feedback: String
    }]
  },
  feedback: {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    comments: String,
    audioFeedback: String,
    highlights: [{
      text: String,
      comment: String,
      type: {
        type: String,
        enum: ['praise', 'suggestion', 'correction']
      }
    }]
  },
  gradedAt: Date,
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  timeSpent: Number,
  plagiarismCheck: {
    checked: {
      type: Boolean,
      default: false
    },
    similarity: Number,
    report: String
  }
}, {
  timestamps: true
});

submissionSchema.index({ assignment: 1, student: 1 });
submissionSchema.index({ student: 1, submittedAt: -1 });
submissionSchema.index({ status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);