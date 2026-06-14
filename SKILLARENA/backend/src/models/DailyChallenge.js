const mongoose = require('mongoose');
const { CHALLENGE_TYPES, CHALLENGE_STATUSES } = require('../constants/enums');

const dailyChallengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    challengeType: {
      type: String,
      enum: CHALLENGE_TYPES,
      required: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    xpReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: CHALLENGE_STATUSES,
      default: 'SCHEDULED',
    },
  },
  {
    timestamps: true,
  },
);

dailyChallengeSchema.index({ status: 1, startAt: 1, endAt: 1 });

const DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema);

module.exports = DailyChallenge;
