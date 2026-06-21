const mongoose = require('mongoose');
const {
  COMMUNITY_POST_TYPES,
  COMMUNITY_CATEGORIES,
  COMMUNITY_POST_STATUSES,
} = require('../constants/enums');

const communityPostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 140,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: 4000,
    },
    postType: {
      type: String,
      enum: COMMUNITY_POST_TYPES,
      default: 'DISCUSSION',
      index: true,
    },
    category: {
      type: String,
      enum: COMMUNITY_CATEGORIES,
      default: 'GENERAL',
      index: true,
    },
    platformCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
      default: null,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
      default: null,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityRoom',
      index: true,
      default: null,
    },
    linkUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: COMMUNITY_POST_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

communityPostSchema.index({ status: 1, roomId: 1, createdAt: -1 });
communityPostSchema.index({ status: 1, createdAt: -1 });
communityPostSchema.index({ status: 1, platformCategoryId: 1, createdAt: -1 });
communityPostSchema.index({ status: 1, courseId: 1, createdAt: -1 });
communityPostSchema.index({ status: 1, likeCount: -1, createdAt: -1 });
communityPostSchema.index({ content: 'text', title: 'text' });

const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);

module.exports = CommunityPost;
