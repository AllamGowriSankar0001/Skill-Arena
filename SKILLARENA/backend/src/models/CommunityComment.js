const mongoose = require('mongoose');
const { COMMUNITY_POST_STATUSES } = require('../constants/enums');

const communityCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: 1200,
    },
    status: {
      type: String,
      enum: COMMUNITY_POST_STATUSES,
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  },
);

communityCommentSchema.index({ postId: 1, createdAt: 1 });

const CommunityComment = mongoose.model('CommunityComment', communityCommentSchema);

module.exports = CommunityComment;
