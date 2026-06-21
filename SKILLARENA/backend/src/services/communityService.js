const crypto = require('crypto');
const mongoose = require('mongoose');
const CommunityPost = require('../models/CommunityPost');
const CommunityLike = require('../models/CommunityLike');
const CommunityComment = require('../models/CommunityComment');
const CommunityRoom = require('../models/CommunityRoom');
const CommunityMember = require('../models/CommunityMember');
const UserStats = require('../models/UserStats');
const Category = require('../models/Category');
const Course = require('../models/Course');
const { COMMUNITY_POST_TYPES } = require('../constants/enums');
const { rankFromLevel } = require('../utils/level');

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;

const createHttpError = (statusCode, message, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const loungeFilter = () => ({
  status: 'ACTIVE',
  roomId: null,
  courseId: null,
  platformCategoryId: null,
});

const generateInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const generateUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inviteCode = generateInviteCode();
    const exists = await CommunityRoom.exists({ inviteCode });
    if (!exists) return inviteCode;
  }
  throw createHttpError(500, 'Could not generate invite code', 'INVITE_CODE_FAILED');
};

const parseChannel = (channel = 'global') => {
  if (!channel || channel === 'global') {
    return { type: 'GLOBAL', id: 'global' };
  }
  if (channel.startsWith('category-')) {
    const categoryId = channel.slice('category-'.length);
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw createHttpError(400, 'Invalid category channel', 'INVALID_CHANNEL');
    }
    return { type: 'CATEGORY', id: channel, categoryId };
  }
  if (channel.startsWith('course-')) {
    const courseId = channel.slice('course-'.length);
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw createHttpError(400, 'Invalid course channel', 'INVALID_CHANNEL');
    }
    return { type: 'COURSE', id: channel, courseId };
  }
  if (channel.startsWith('room-')) {
    const roomId = channel.slice('room-'.length);
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      throw createHttpError(400, 'Invalid community channel', 'INVALID_CHANNEL');
    }
    return { type: 'ROOM', id: channel, roomId };
  }
  throw createHttpError(400, 'Unknown channel', 'INVALID_CHANNEL');
};

const buildChannelFilter = (channel = 'global') => {
  const parsed = parseChannel(channel);
  if (parsed.type === 'GLOBAL') return loungeFilter();
  if (parsed.type === 'CATEGORY') {
    return { status: 'ACTIVE', platformCategoryId: parsed.categoryId, roomId: null };
  }
  if (parsed.type === 'COURSE') {
    return { status: 'ACTIVE', courseId: parsed.courseId, roomId: null };
  }
  return { status: 'ACTIVE', roomId: parsed.roomId };
};

const formatAuthor = (authorDoc, statsDoc) => {
  if (!authorDoc) return null;
  const level = statsDoc?.level ?? 1;
  const role = authorDoc.role || 'STUDENT';
  return {
    id: String(authorDoc._id),
    name: authorDoc.name,
    avatarUrl: authorDoc.avatarUrl || '',
    level,
    rankLabel: rankFromLevel(level),
    role,
    isAdmin: role === 'ADMIN',
  };
};

const resolveChannelId = (postDoc) => {
  if (postDoc.roomId) return `room-${postDoc.roomId}`;
  if (postDoc.courseId) return `course-${postDoc.courseId}`;
  if (postDoc.platformCategoryId) return `category-${postDoc.platformCategoryId}`;
  return 'global';
};

const serializePost = (postDoc, { liked = false } = {}) => {
  const author = postDoc.authorId?.name
    ? formatAuthor(postDoc.authorId, postDoc.authorStats)
    : null;

  return {
    id: String(postDoc._id),
    title: postDoc.title || '',
    content: postDoc.content,
    postType: postDoc.postType,
    category: postDoc.category,
    channel: resolveChannelId(postDoc),
    linkUrl: postDoc.linkUrl || '',
    likeCount: postDoc.likeCount || 0,
    commentCount: postDoc.commentCount || 0,
    liked,
    isOwner: Boolean(postDoc.isOwner),
    isAdminMessage: Boolean(author?.isAdmin),
    author,
    createdAt: postDoc.createdAt,
    updatedAt: postDoc.updatedAt,
  };
};

const serializeComment = (commentDoc) => {
  const author = commentDoc.authorId?.name
    ? formatAuthor(commentDoc.authorId, commentDoc.authorStats)
    : null;

  return {
    id: String(commentDoc._id),
    postId: String(commentDoc.postId),
    content: commentDoc.content,
    author,
    createdAt: commentDoc.createdAt,
    isOwner: Boolean(commentDoc.isOwner),
  };
};

const serializeRoomChannel = (room, membership, postCount = 0, options = {}) => ({
  id: `room-${room._id}`,
  type: 'ROOM',
  roomId: String(room._id),
  name: room.name,
  slug: room.inviteCode,
  description:
    room.description ||
    (room.isOfficial
      ? 'Official Skill Arena community — announcements and discussions.'
      : 'Community created by Skill Arena members.'),
  postCount,
  memberCount: room.memberCount || 0,
  inviteCode: room.inviteCode,
  hasPassword: Boolean(room.hasPassword),
  isOfficial: Boolean(room.isOfficial),
  isMember: options.isMember !== false && Boolean(membership),
  isOwner: membership?.role === 'OWNER',
  canManage: membership?.role === 'OWNER' || Boolean(options.isPlatformAdmin),
  role: membership?.role || null,
});

const attachAuthorStats = async (authorIds) => {
  const uniqueIds = [...new Set(authorIds.map(String))];
  if (!uniqueIds.length) return new Map();

  const stats = await UserStats.find({ userId: { $in: uniqueIds } })
    .select('userId level totalXp')
    .lean();

  return new Map(stats.map((item) => [String(item.userId), item]));
};

const countForFilter = (filter) => CommunityPost.countDocuments(filter);

const getMembership = async (userId, roomId) =>
  CommunityMember.findOne({ roomId, userId }).lean();

const assertRoomAccess = async (userId, roomId, { isPlatformAdmin = false } = {}) => {
  const room = await CommunityRoom.findOne({ _id: roomId, status: 'ACTIVE' }).lean();
  if (!room) {
    throw createHttpError(404, 'Community not found', 'ROOM_NOT_FOUND');
  }

  let membership = await getMembership(userId, roomId);
  if (membership) {
    return { room, membership };
  }

  if (isPlatformAdmin) {
    return { room, membership: { role: 'ADMIN', userId, roomId } };
  }

  if (room.isOfficial && !room.hasPassword) {
    membership = await CommunityMember.create({
      roomId,
      userId,
      role: 'MEMBER',
    });
    await CommunityRoom.updateOne({ _id: roomId }, { $inc: { memberCount: 1 } });
    return { room, membership: membership.toObject() };
  }

  throw createHttpError(403, 'Join this community to view messages', 'NOT_A_MEMBER');
};

const getCommunityMeta = async (userId, { isPlatformAdmin = false } = {}) => {
  const [categories, courses, postCount, memberCount, globalCount, memberships, officialRooms] =
    await Promise.all([
      Category.find({ status: 'ACTIVE' }).sort({ sortOrder: 1, name: 1 }).select('name slug').lean(),
      Course.find({ status: 'PUBLISHED' })
        .sort({ title: 1 })
        .select('title slug categoryId')
        .limit(40)
        .lean(),
      CommunityPost.countDocuments({ status: 'ACTIVE' }),
      CommunityPost.distinct('authorId', { status: 'ACTIVE' }).then((ids) => ids.length),
      countForFilter(loungeFilter()),
      CommunityMember.find({ userId }).select('roomId role').lean(),
      CommunityRoom.find({ status: 'ACTIVE', isOfficial: true }).sort({ updatedAt: -1 }).lean(),
    ]);

  const membershipMap = new Map(memberships.map((item) => [String(item.roomId), item]));
  const memberRoomIds = new Set(memberships.map((item) => String(item.roomId)));

  const userRooms = memberships.length
    ? await CommunityRoom.find({ _id: { $in: memberships.map((item) => item.roomId) }, status: 'ACTIVE' })
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  const memberRoomIdSet = new Set(userRooms.map((room) => String(room._id)));

  const categoryChannels = await Promise.all(
    categories.map(async (category) => ({
      id: `category-${category._id}`,
      type: 'CATEGORY',
      name: category.name,
      slug: category.slug,
      description: `Discuss ${category.name.toLowerCase()} courses, battles, and study tips.`,
      postCount: await countForFilter({
        status: 'ACTIVE',
        platformCategoryId: category._id,
        roomId: null,
      }),
    })),
  );

  const courseChannels = await Promise.all(
    courses.map(async (course) => ({
      id: `course-${course._id}`,
      type: 'COURSE',
      name: course.title,
      slug: course.slug,
      description: `Course lounge for ${course.title}. Ask questions and share progress.`,
      postCount: await countForFilter({
        status: 'ACTIVE',
        courseId: course._id,
        roomId: null,
      }),
    })),
  );

  const roomChannels = await Promise.all(
    userRooms.map(async (room) =>
      serializeRoomChannel(
        room,
        membershipMap.get(String(room._id)),
        await countForFilter({ status: 'ACTIVE', roomId: room._id }),
        { isMember: true, isPlatformAdmin },
      ),
    ),
  );

  const officialChannels = await Promise.all(
    officialRooms
      .filter((room) => !memberRoomIdSet.has(String(room._id)))
      .map(async (room) =>
        serializeRoomChannel(
          room,
          null,
          await countForFilter({ status: 'ACTIVE', roomId: room._id }),
          { isMember: false, isPlatformAdmin },
        ),
      ),
  );

  const channels = [
    {
      id: 'global',
      type: 'GLOBAL',
      name: 'general',
      slug: 'general',
      description: 'Global lounge for everyone — introductions, wins, and arena chat.',
      postCount: globalCount,
    },
    ...officialChannels,
    ...roomChannels,
    ...categoryChannels,
    ...courseChannels,
  ];

  return {
    channels,
    stats: {
      postCount,
      memberCount,
    },
  };
};

const getFeed = async (userId, query = {}, { isPlatformAdmin = false } = {}) => {
  const channel = query.channel || 'global';
  const parsed = parseChannel(channel);

  if (parsed.type === 'ROOM') {
    await assertRoomAccess(userId, parsed.roomId, { isPlatformAdmin });
  }

  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  const sort = { createdAt: -1 };

  const filter = buildChannelFilter(channel);
  if (query.search?.trim()) {
    filter.$text = { $search: query.search.trim() };
  }

  const [posts, total] = await Promise.all([
    CommunityPost.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name avatarUrl role')
      .lean(),
    CommunityPost.countDocuments(filter),
  ]);

  const postIds = posts.map((post) => post._id);
  const authorIds = posts.map((post) => post.authorId?._id).filter(Boolean);

  const [likes, statsMap] = await Promise.all([
    CommunityLike.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
    attachAuthorStats(authorIds),
  ]);

  const likedSet = new Set(likes.map((like) => String(like.postId)));

  const serialized = posts.map((post) => {
    const authorStats = statsMap.get(String(post.authorId?._id));
    return serializePost(
      {
        ...post,
        authorStats,
        isOwner: String(post.authorId?._id) === String(userId),
      },
      { liked: likedSet.has(String(post._id)) },
    );
  });

  return {
    channel,
    posts: serialized.reverse(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + posts.length < total,
    },
  };
};

const createPost = async (userId, payload = {}, { isPlatformAdmin = false } = {}) => {
  const content = payload.content?.trim();
  if (!content) {
    throw createHttpError(400, 'Message is required', 'CONTENT_REQUIRED');
  }
  if (content.length > 4000) {
    throw createHttpError(400, 'Message is too long', 'CONTENT_TOO_LONG');
  }

  const channel = parseChannel(payload.channel || 'global');
  if (channel.type === 'ROOM') {
    await assertRoomAccess(userId, channel.roomId, { isPlatformAdmin });
  }

  const linkUrl = normalizeUrl(payload.linkUrl);
  const postType = linkUrl ? 'RESOURCE' : 'DISCUSSION';

  const doc = {
    authorId: userId,
    content,
    postType,
    category: 'GENERAL',
    linkUrl,
    courseId: null,
    platformCategoryId: null,
    roomId: null,
  };

  if (channel.type === 'CATEGORY') {
    doc.platformCategoryId = channel.categoryId;
  } else if (channel.type === 'COURSE') {
    doc.courseId = channel.courseId;
  } else if (channel.type === 'ROOM') {
    doc.roomId = channel.roomId;
  }

  const post = await CommunityPost.create(doc);

  const populated = await CommunityPost.findById(post._id)
    .populate('authorId', 'name avatarUrl role')
    .lean();

  const statsMap = await attachAuthorStats([userId]);
  const authorStats = statsMap.get(String(userId));

  return serializePost(
    {
      ...populated,
      authorStats,
      isOwner: true,
    },
    { liked: false },
  );
};

const createRoom = async (userId, payload = {}, { creatorRole = 'STUDENT' } = {}) => {
  const name = payload.name?.trim();
  if (!name) {
    throw createHttpError(400, 'Community name is required', 'NAME_REQUIRED');
  }
  if (name.length > 80) {
    throw createHttpError(400, 'Community name is too long', 'NAME_TOO_LONG');
  }

  const description = payload.description?.trim().slice(0, 500) || '';
  const password = payload.password?.trim() || '';
  if (password && password.length < 4) {
    throw createHttpError(400, 'Password must be at least 4 characters', 'PASSWORD_TOO_SHORT');
  }

  const isOfficial = creatorRole === 'ADMIN';
  const inviteCode = await generateUniqueInviteCode();
  const room = await CommunityRoom.create({
    name,
    description,
    ownerId: userId,
    inviteCode,
    password: password || undefined,
    hasPassword: Boolean(password),
    isOfficial,
    memberCount: 1,
  });

  await CommunityMember.create({
    roomId: room._id,
    userId,
    role: 'OWNER',
  });

  return {
    room: serializeRoomChannel(room.toObject(), { role: 'OWNER' }, 0, {
      isMember: true,
      isPlatformAdmin: isOfficial,
    }),
  };
};

const joinRoom = async (userId, payload = {}) => {
  const inviteCode = payload.inviteCode?.trim().toUpperCase();
  if (!inviteCode) {
    throw createHttpError(400, 'Invite code is required', 'INVITE_CODE_REQUIRED');
  }

  const room = await CommunityRoom.findOne({ inviteCode, status: 'ACTIVE' }).select('+password');
  if (!room) {
    throw createHttpError(404, 'Community not found. Check the invite code.', 'ROOM_NOT_FOUND');
  }

  const existing = await getMembership(userId, room._id);
  if (existing) {
    return {
      room: serializeRoomChannel(
        room.toObject(),
        existing,
        await countForFilter({ status: 'ACTIVE', roomId: room._id }),
      ),
      alreadyMember: true,
    };
  }

  if (room.hasPassword) {
    const password = payload.password?.trim() || '';
    if (!password) {
      throw createHttpError(401, 'This community requires a password', 'PASSWORD_REQUIRED');
    }
    const valid = await room.comparePassword(password);
    if (!valid) {
      throw createHttpError(401, 'Incorrect community password', 'INVALID_PASSWORD');
    }
  }

  const membership = await CommunityMember.create({
    roomId: room._id,
    userId,
    role: 'MEMBER',
  });

  await CommunityRoom.updateOne({ _id: room._id }, { $inc: { memberCount: 1 } });
  room.memberCount = (room.memberCount || 0) + 1;

  return {
    room: serializeRoomChannel(
      room.toObject(),
      membership.toObject(),
      await countForFilter({ status: 'ACTIVE', roomId: room._id }),
    ),
    alreadyMember: false,
  };
};

const leaveRoom = async (userId, roomId) => {
  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw createHttpError(400, 'Invalid community', 'INVALID_ROOM');
  }

  const membership = await CommunityMember.findOne({ roomId, userId });
  if (!membership) {
    throw createHttpError(404, 'You are not a member of this community', 'NOT_A_MEMBER');
  }
  if (membership.role === 'OWNER') {
    throw createHttpError(
      400,
      'Owners must delete the community instead of leaving',
      'OWNER_CANNOT_LEAVE',
    );
  }

  await membership.deleteOne();
  await CommunityRoom.updateOne({ _id: roomId, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
  return { left: true };
};

const deleteRoom = async (userId, roomId, isAdmin = false) => {
  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw createHttpError(400, 'Invalid community', 'INVALID_ROOM');
  }

  const room = await CommunityRoom.findOne({ _id: roomId, status: 'ACTIVE' });
  if (!room) {
    throw createHttpError(404, 'Community not found', 'ROOM_NOT_FOUND');
  }

  if (!isAdmin && String(room.ownerId) !== String(userId)) {
    throw createHttpError(403, 'Only the owner can delete this community', 'FORBIDDEN');
  }

  room.status = 'ARCHIVED';
  await room.save();
  await CommunityMember.deleteMany({ roomId });
  await CommunityPost.updateMany({ roomId }, { status: 'DELETED' });

  return { deleted: true };
};

const updateRoom = async (userId, roomId, payload = {}, isPlatformAdmin = false) => {
  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw createHttpError(400, 'Invalid community', 'INVALID_ROOM');
  }

  const room = await CommunityRoom.findOne({ _id: roomId, status: 'ACTIVE' }).select('+password');
  if (!room) {
    throw createHttpError(404, 'Community not found', 'ROOM_NOT_FOUND');
  }

  const membership = await getMembership(userId, roomId);
  const canManage =
    isPlatformAdmin || membership?.role === 'OWNER' || String(room.ownerId) === String(userId);
  if (!canManage) {
    throw createHttpError(403, 'You cannot edit this community', 'FORBIDDEN');
  }

  if (payload.name !== undefined) {
    const name = payload.name?.trim();
    if (!name) {
      throw createHttpError(400, 'Community name is required', 'NAME_REQUIRED');
    }
    if (name.length > 80) {
      throw createHttpError(400, 'Community name is too long', 'NAME_TOO_LONG');
    }
    room.name = name;
  }

  if (payload.description !== undefined) {
    room.description = payload.description?.trim().slice(0, 500) || '';
  }

  if (payload.removePassword === true) {
    room.password = undefined;
    room.hasPassword = false;
  } else if (payload.password !== undefined) {
    const password = payload.password?.trim() || '';
    if (password && password.length < 4) {
      throw createHttpError(400, 'Password must be at least 4 characters', 'PASSWORD_TOO_SHORT');
    }
    if (password) {
      room.password = password;
    } else {
      room.password = undefined;
      room.hasPassword = false;
    }
  }

  await room.save();

  const postCount = await countForFilter({ status: 'ACTIVE', roomId: room._id });
  return {
    room: serializeRoomChannel(room.toObject(), membership || { role: 'OWNER' }, postCount, {
      isMember: Boolean(membership) || isPlatformAdmin,
      isPlatformAdmin,
    }),
  };
};

const toggleLike = async (userId, postId) => {
  const post = await CommunityPost.findOne({ _id: postId, status: 'ACTIVE' });
  if (!post) {
    throw createHttpError(404, 'Message not found', 'POST_NOT_FOUND');
  }

  const existing = await CommunityLike.findOne({ userId, postId });

  if (existing) {
    await Promise.all([
      existing.deleteOne(),
      CommunityPost.updateOne({ _id: postId }, { $inc: { likeCount: -1 } }),
    ]);
    const updated = await CommunityPost.findById(postId).select('likeCount').lean();
    return {
      liked: false,
      likeCount: Math.max(0, updated?.likeCount ?? 0),
    };
  }

  await Promise.all([
    CommunityLike.create({ userId, postId }),
    CommunityPost.updateOne({ _id: postId }, { $inc: { likeCount: 1 } }),
  ]);
  const updated = await CommunityPost.findById(postId).select('likeCount').lean();
  return {
    liked: true,
    likeCount: updated?.likeCount ?? 1,
  };
};

const listComments = async (userId, postId, query = {}) => {
  const post = await CommunityPost.findOne({ _id: postId, status: 'ACTIVE' });
  if (!post) {
    throw createHttpError(404, 'Message not found', 'POST_NOT_FOUND');
  }

  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 30));
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    CommunityComment.find({ postId, status: 'ACTIVE' })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name avatarUrl role')
      .lean(),
    CommunityComment.countDocuments({ postId, status: 'ACTIVE' }),
  ]);

  const authorIds = comments.map((comment) => comment.authorId?._id).filter(Boolean);
  const statsMap = await attachAuthorStats(authorIds);

  return {
    comments: comments.map((comment) =>
      serializeComment({
        ...comment,
        authorStats: statsMap.get(String(comment.authorId?._id)),
        isOwner: String(comment.authorId?._id) === String(userId),
      }),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + comments.length < total,
    },
  };
};

const addComment = async (userId, postId, payload = {}) => {
  const content = payload.content?.trim();
  if (!content) {
    throw createHttpError(400, 'Reply is required', 'CONTENT_REQUIRED');
  }
  if (content.length > 1200) {
    throw createHttpError(400, 'Reply is too long', 'CONTENT_TOO_LONG');
  }

  const post = await CommunityPost.findOne({ _id: postId, status: 'ACTIVE' });
  if (!post) {
    throw createHttpError(404, 'Message not found', 'POST_NOT_FOUND');
  }

  const comment = await CommunityComment.create({
    postId,
    authorId: userId,
    content,
  });

  await CommunityPost.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });

  const populated = await CommunityComment.findById(comment._id)
    .populate('authorId', 'name avatarUrl role')
    .lean();

  const statsMap = await attachAuthorStats([userId]);

  return {
    comment: serializeComment({
      ...populated,
      authorStats: statsMap.get(String(userId)),
      isOwner: true,
    }),
    commentCount: (post.commentCount || 0) + 1,
  };
};

const deletePost = async (userId, postId, isAdmin = false) => {
  const post = await CommunityPost.findOne({ _id: postId, status: 'ACTIVE' });
  if (!post) {
    throw createHttpError(404, 'Message not found', 'POST_NOT_FOUND');
  }

  if (!isAdmin && String(post.authorId) !== String(userId)) {
    throw createHttpError(403, 'You can only delete your own messages', 'FORBIDDEN');
  }

  post.status = 'DELETED';
  await post.save();
  return { deleted: true };
};

module.exports = {
  getCommunityMeta,
  getFeed,
  createPost,
  createRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
  updateRoom,
  toggleLike,
  listComments,
  addComment,
  deletePost,
};
