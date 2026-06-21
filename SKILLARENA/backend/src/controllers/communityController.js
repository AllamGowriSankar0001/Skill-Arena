const communityService = require('../services/communityService');

const isAdminUser = (user) => user?.role === 'ADMIN';

const adminOptions = (user) => ({ isPlatformAdmin: isAdminUser(user) });

const handleError = (error, res, next) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
    });
  }
  return next(error);
};

const getMeta = async (req, res, next) => {
  try {
    const meta = await communityService.getCommunityMeta(req.user._id, adminOptions(req.user));
    res.json(meta);
  } catch (error) {
    handleError(error, res, next);
  }
};

const getFeed = async (req, res, next) => {
  try {
    const feed = await communityService.getFeed(req.user._id, req.query, adminOptions(req.user));
    res.json(feed);
  } catch (error) {
    handleError(error, res, next);
  }
};

const createPost = async (req, res, next) => {
  try {
    const post = await communityService.createPost(req.user._id, req.body, adminOptions(req.user));
    res.status(201).json({ post });
  } catch (error) {
    handleError(error, res, next);
  }
};

const createRoom = async (req, res, next) => {
  try {
    const payload = await communityService.createRoom(req.user._id, req.body, {
      creatorRole: req.user.role,
    });
    res.status(201).json(payload);
  } catch (error) {
    handleError(error, res, next);
  }
};

const joinRoom = async (req, res, next) => {
  try {
    const payload = await communityService.joinRoom(req.user._id, req.body);
    res.json(payload);
  } catch (error) {
    handleError(error, res, next);
  }
};

const leaveRoom = async (req, res, next) => {
  try {
    const result = await communityService.leaveRoom(req.user._id, req.params.roomId);
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const payload = await communityService.updateRoom(
      req.user._id,
      req.params.roomId,
      req.body,
      isAdminUser(req.user),
    );
    res.json(payload);
  } catch (error) {
    handleError(error, res, next);
  }
};

const deleteRoom = async (req, res, next) => {
  try {
    const result = await communityService.deleteRoom(
      req.user._id,
      req.params.roomId,
      isAdminUser(req.user),
    );
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const result = await communityService.toggleLike(req.user._id, req.params.postId);
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

const listComments = async (req, res, next) => {
  try {
    const payload = await communityService.listComments(
      req.user._id,
      req.params.postId,
      req.query,
    );
    res.json(payload);
  } catch (error) {
    handleError(error, res, next);
  }
};

const addComment = async (req, res, next) => {
  try {
    const payload = await communityService.addComment(
      req.user._id,
      req.params.postId,
      req.body,
    );
    res.status(201).json(payload);
  } catch (error) {
    handleError(error, res, next);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const result = await communityService.deletePost(
      req.user._id,
      req.params.postId,
      isAdminUser(req.user),
    );
    res.json(result);
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = {
  getMeta,
  getFeed,
  createPost,
  createRoom,
  joinRoom,
  leaveRoom,
  updateRoom,
  deleteRoom,
  toggleLike,
  listComments,
  addComment,
  deletePost,
};
