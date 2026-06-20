const User = require('../models/User');
const UserStats = require('../models/UserStats');
const generateToken = require('../utils/generateToken');
const { getUserStats } = require('../services/userStatsService');
const { enrollUserInStarterCourse } = require('../services/enrollmentService');
const { normalizeResumeProfile } = require('../utils/resumeProfile');
const MSG = require('../constants/authMessages');
const { validateSignupFields, validateLoginFields } = require('../utils/authValidation');
const {
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
} = require('../utils/loginRateLimit');

const AI_KEY_MIN_LENGTH = 20;

const signup = async (req, res, next) => {
  try {
    const validation = validateSignupFields(req.body);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const { name, email, password } = validation;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: MSG.EMAIL_EXISTS });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    await UserStats.createForUser(user._id);
    await enrollUserInStarterCourse(user._id);

    res.status(201).json({
      message: 'Account created successfully. Please sign in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const validation = validateLoginFields(req.body);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const { email, password } = validation;
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    const rateCheck = checkLoginAllowed(email, clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: rateCheck.message,
        code: 'LOGIN_RATE_LIMIT',
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      });
    }

    const user = await User.findOne({ email }).select('+password +aiKeys');

    const isInvalidLogin =
      !user ||
      user.status === 'BLOCKED' ||
      user.status === 'DELETED' ||
      !(await user.comparePassword(password));

    if (isInvalidLogin) {
      recordFailedLogin(email, clientIp);
      return res.status(401).json({ message: MSG.INVALID_CREDENTIALS });
    }

    clearLoginAttempts(email, clientIp);

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

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: MSG.FILL_REQUIRED_FIELDS });
    }

    res.json({
      message: MSG.FORGOT_PASSWORD_SENT,
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
  forgotPassword,
  getMe,
  updateMe,
};
