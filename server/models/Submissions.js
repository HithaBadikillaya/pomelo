const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Ongoing', 'Completed'],
    default: 'Ongoing',
  },
  forcedSubmission: {
    type: Boolean,
    default: false,
  },
  autoSubmitReason: {
    type: String,
    trim: true,
  },
  submittedAt: Date,
  totalScore: {
    type: Number,
    default: 0,
  },
  submissions: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    answer: [String], // MCQ answers (e.g., ["A"] or ["A", "C", "D"])
    // Coding specific fields
    code: String,
    language: String,
    status: {
      type: String,
      enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error', 'Pending'],
    },
    testCaseResults: [{
      testCase: Number,
      passed: Boolean,
      input: String,
      expectedOutput: String,
      actualOutput: String,
      error: String,
    }],
    executionTime: Number, // in milliseconds
    memoryUsed: Number, // in KB
    score: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, { timestamps: true });

// Ensure one attempt per user per contest
submissionSchema.index({ contest: 1, user: 1 }, { unique: true });

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
