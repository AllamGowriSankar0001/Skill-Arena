const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { COMMUNITY_ROOM_STATUSES } = require('../constants/enums');

const communityRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Community name is required'],
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    hasPassword: {
      type: Boolean,
      default: false,
    },
    isOfficial: {
      type: Boolean,
      default: false,
      index: true,
    },
    memberCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    status: {
      type: String,
      enum: COMMUNITY_ROOM_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

communityRoomSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();

  const plain = typeof this.password === 'string' ? this.password.trim() : '';
  if (!plain) {
    this.password = undefined;
    this.hasPassword = false;
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(plain, salt);
  this.hasPassword = true;
  return next();
});

communityRoomSchema.methods.comparePassword = async function comparePassword(candidate = '') {
  if (!this.hasPassword) return true;
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

const CommunityRoom = mongoose.model('CommunityRoom', communityRoomSchema);

module.exports = CommunityRoom;
