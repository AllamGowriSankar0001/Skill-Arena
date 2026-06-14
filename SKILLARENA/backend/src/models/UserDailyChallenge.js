const mongoose = require('mongoose');
const { USER_CHALLENGE_STATUSES } = require('../constants/enums');

const userDailyChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dailyChallengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyChallenge',
      required: true,
    },
    status: {
      type: String,
      enum: USER_CHALLENGE_STATUSES,
      default: 'NOT_STARTED',
    },
    currentProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    assessmentAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
    },
    xpAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

userDailyChallengeSchema.index({ userId: 1, dailyChallengeId: 1 }, { unique: true });
userDailyChallengeSchema.index({ userId: 1, status: 1 });

const UserDailyChallenge = mongoose.model('UserDailyChallenge', userDailyChallengeSchema);

module.exports = UserDailyChallenge;
