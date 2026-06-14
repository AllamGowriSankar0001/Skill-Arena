const mongoose = require('mongoose');
const { USER_ACHIEVEMENT_STATUSES } = require('../constants/enums');

const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredValue: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: USER_ACHIEVEMENT_STATUSES,
      default: 'IN_PROGRESS',
    },
    xpAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    unlockedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, status: 1 });

const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

module.exports = UserAchievement;
