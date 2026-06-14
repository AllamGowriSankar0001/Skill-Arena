const mongoose = require('mongoose');
const { LEADERBOARD_PERIOD_TYPES } = require('../constants/enums');

const leaderboardEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    periodType: {
      type: String,
      enum: LEADERBOARD_PERIOD_TYPES,
      required: true,
    },
    periodKey: {
      type: String,
      required: true,
      trim: true,
    },
    xpEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    battleWins: {
      type: Number,
      default: 0,
      min: 0,
    },
    coursesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionsCorrect: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaderboardScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    rank: {
      type: Number,
      min: 1,
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

leaderboardEntrySchema.index({ periodType: 1, periodKey: 1, userId: 1 }, { unique: true });
leaderboardEntrySchema.index({ periodType: 1, periodKey: 1, leaderboardScore: -1 });

const LeaderboardEntry = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);

module.exports = LeaderboardEntry;
