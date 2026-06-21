const mongoose = require('mongoose');
const { COMMUNITY_MEMBER_ROLES } = require('../constants/enums');

const communityMemberSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityRoom',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: COMMUNITY_MEMBER_ROLES,
      default: 'MEMBER',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

communityMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

const CommunityMember = mongoose.model('CommunityMember', communityMemberSchema);

module.exports = CommunityMember;
