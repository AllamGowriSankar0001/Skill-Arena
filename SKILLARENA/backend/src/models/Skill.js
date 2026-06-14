const mongoose = require('mongoose');
const { ACTIVE_STATUSES } = require('../constants/enums');

const skillSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    iconUrl: {
      type: String,
      trim: true,
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

skillSchema.index({ categoryId: 1 });
skillSchema.index({ status: 1 });

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
