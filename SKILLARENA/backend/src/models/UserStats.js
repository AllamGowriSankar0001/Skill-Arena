const mongoose = require('mongoose');
const { calculateLevelProgress } = require('../utils/level');

const userStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    currentLevelXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextLevelXp: {
      type: Number,
      default: 100,
      min: 1,
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActivityDate: {
      type: String,
      trim: true,
    },
    coursesEnrolled: {
      type: Number,
      default: 0,
      min: 0,
    },
    coursesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    lessonsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    assessmentsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionsAttempted: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionsCorrect: {
      type: Number,
      default: 0,
      min: 0,
    },
    practiceSessionsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    battlesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    battlesWon: {
      type: Number,
      default: 0,
      min: 0,
    },
    battlesLost: {
      type: Number,
      default: 0,
      min: 0,
    },
    battlesDrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    achievementsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLearningMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

userStatsSchema.index({ totalXp: -1 });
userStatsSchema.index({ battlesWon: -1 });

userStatsSchema.methods.syncLevelFields = function syncLevelFields() {
  const progress = calculateLevelProgress(this.totalXp);
  this.level = progress.level;
  this.currentLevelXp = progress.currentLevelXp;
  this.nextLevelXp = progress.nextLevelXp;
};

userStatsSchema.statics.createForUser = async function createForUser(userId) {
  const stats = new this({ userId });
  stats.syncLevelFields();
  return stats.save();
};

const UserStats = mongoose.model('UserStats', userStatsSchema);

module.exports = UserStats;
