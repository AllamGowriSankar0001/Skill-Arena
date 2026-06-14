const mongoose = require('mongoose');

const userDailyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activityDate: {
      type: String,
      required: true,
      trim: true,
    },
    xpEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    lessonsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    coursesCompleted: {
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
    learningMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

userDailyActivitySchema.index({ userId: 1, activityDate: 1 }, { unique: true });
userDailyActivitySchema.index({ activityDate: 1 });

const UserDailyActivity = mongoose.model('UserDailyActivity', userDailyActivitySchema);

module.exports = UserDailyActivity;
