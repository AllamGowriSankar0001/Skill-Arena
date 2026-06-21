const mongoose = require('mongoose');

const communityLikeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

communityLikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
communityLikeSchema.index({ postId: 1, createdAt: -1 });

const CommunityLike = mongoose.model('CommunityLike', communityLikeSchema);

module.exports = CommunityLike;
