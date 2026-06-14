const User = require('../models/User');
const UserStats = require('../models/UserStats');
const generateToken = require('../utils/generateToken');
const { getUserStats } = require('../services/userStatsService');
const { enrollUserInStarterCourse } = require('../services/enrollmentService');
const { normalizeResumeProfile } = require('../utils/resumeProfile');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AI_KEY_MIN_LENGTH = 20;

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    const stats = await UserStats.createForUser(user._id);
    await enrollUserInStarterCourse(user._id);
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: user.toPublicJSON(stats),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +aiKeys');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ message: 'This account has been blocked.' });
    }

    if (user.status === 'DELETED') {
      return res.status(403).json({ message: 'This account no longer exists.' });
    }

    user.lastActiveAt = new Date();
    await user.save();

    const stats = user.role === 'ADMIN' ? null : await getUserStats(user._id);
    const token = generateToken(user._id);

    res.json({
      message: 'Logged in successfully.',
      token,
      user: user.toPublicJSON(stats),
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+aiKeys');
    const stats = user.role === 'ADMIN' ? null : await getUserStats(req.user._id);
    res.json({ user: user.toPublicJSON(stats) });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { geminiApiKey, openaiApiKey, resumeProfile } = req.body || {};
    const user = await User.findById(req.user._id).select('+aiKeys');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (resumeProfile !== undefined) {
      user.resumeProfile = normalizeResumeProfile({
        ...(user.resumeProfile?.toObject?.() || user.resumeProfile || {}),
        ...resumeProfile,
      });
    }

    if (geminiApiKey !== undefined) {
      if (geminiApiKey && String(geminiApiKey).trim().length < AI_KEY_MIN_LENGTH) {
        return res.status(400).json({ message: 'Gemini API key looks too short. Paste the full key from Google AI Studio.' });
      }
      user.setAiKey('gemini', geminiApiKey);
    }

    if (openaiApiKey !== undefined) {
      if (openaiApiKey && String(openaiApiKey).trim().length < AI_KEY_MIN_LENGTH) {
        return res.status(400).json({ message: 'ChatGPT API key looks too short. Paste the full key from OpenAI.' });
      }
      user.setAiKey('openai', openaiApiKey);
    }

    await user.save();
    const stats = user.role === 'ADMIN' ? null : await getUserStats(user._id);

    res.json({
      message: 'Profile updated.',
      user: user.toPublicJSON(stats),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateMe,
};
