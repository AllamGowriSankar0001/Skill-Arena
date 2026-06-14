const mongoose = require('mongoose');
const {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_METRICS,
  ACTIVE_STATUSES,
} = require('../constants/enums');

const achievementCriteriaSchema = new mongoose.Schema(
  {
    metric: {
      type: String,
      enum: ACHIEVEMENT_METRICS,
      required: true,
    },
    requiredValue: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const achievementSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    iconUrl: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ACHIEVEMENT_CATEGORIES,
      required: true,
    },
    criteria: {
      type: achievementCriteriaSchema,
      required: true,
    },
    xpReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ACTIVE_STATUSES,
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  },
);

achievementSchema.index({ category: 1 });
achievementSchema.index({ status: 1 });

const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement;
