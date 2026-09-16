const User = require('../models/User');
const UserStats = require('../models/UserStats');
const { getUserStats } = require('../services/userStatsService');
const { enrollUserInStarterCourse } = require('../services/enrollmentService');
const { normalizeResumeProfile } = require('../utils/resumeProfile');
const MSG = require('../constants/authMessages');
const {
  validateSignupFields,
  validateLoginFields,
  validatePasswordValue,
} = require('../utils/authValidation');
const {
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
} = require('../utils/loginRateLimit');
const {
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
} = require('../services/sessionService');
const {
  requestPasswordReset,
  resetPasswordWithToken,
} = require('../services/passwordResetService');
const {
  setAuthCookies,
  clearAuthCookies,
  issueCsrfToken,
  readRefreshToken,
  readAccessToken,
} = require('../utils/authCookies');
const { verifyAccessToken } = require('../utils/accessToken');
const { shouldReturnTokensInBody } = require('../utils/authClientKind');
const { ACCESS_TTL_SECONDS } = require('../config/authCookies');

const AI_KEY_MIN_LENGTH = 20;

const securityLog = (event, details = {}) => {
  // Never log tokens, passwords, cookies, or Authorization headers.
  console.info('[auth]', { event, ...details, at: new Date().toISOString() });
};

const attachSessionResponse = (req, res, { accessToken, refreshToken, user, message }) => {
  const csrfToken = issueCsrfToken();
  setAuthCookies(res, { accessToken, refreshToken, csrfToken });

  const body = {
    message,
    user,
    csrfToken,
  };

  // Browser SPA: credentials stay in HttpOnly cookies only (not exposed to JS).
  // Native/mobile: include short-lived access + rotating refresh for SecureStore.
  if (shouldReturnTokensInBody(req)) {
    body.accessToken = accessToken;
    body.refreshToken = refreshToken;
    body.expiresIn = ACCESS_TTL_SECONDS;
  }

  return res.json(body);
};

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

    securityLog('signup', { userId: String(user._id) });

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
      securityLog('login_failure', { emailDomain: email.split('@')[1] || 'unknown' });
      return res.status(401).json({ message: MSG.INVALID_CREDENTIALS });
    }

    clearLoginAttempts(email, clientIp);

    user.lastActiveAt = new Date();
    await user.save();

    const sessionBundle = await createSession(user._id, {
      userAgent: req.get('user-agent') || '',
      ip: clientIp,
    });

    const stats = user.role === 'ADMIN' ? null : await getUserStats(user._id);
    securityLog('login_success', { userId: String(user._id) });

    return attachSessionResponse(req, res, {
      accessToken: sessionBundle.accessToken,
      refreshToken: sessionBundle.refreshToken,
      user: user.toPublicJSON(stats),
      message: 'Logged in successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const presented = readRefreshToken(req);
    const result = await rotateRefreshToken(presented, {
      userAgent: req.get('user-agent') || '',
      ip: req.ip || req.socket?.remoteAddress || '',
    });

    if (!result.ok) {
      clearAuthCookies(res);
      if (result.code === 'REFRESH_REUSE') {
        securityLog('refresh_reuse_detected', {});
      }
      return res.status(401).json({
        message: 'Session expired. Please sign in again.',
        code: result.code || 'REFRESH_FAILED',
      });
    }

    const user = await User.findById(result.userId).select('+aiKeys');
    if (!user || user.status === 'BLOCKED' || user.status === 'DELETED') {
      clearAuthCookies(res);
      await revokeSession(result.session._id);
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    const stats = user.role === 'ADMIN' ? null : await getUserStats(user._id);
    securityLog('refresh_success', { userId: String(user._id) });

    return attachSessionResponse(req, res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: user.toPublicJSON(stats),
      message: 'Session refreshed.',
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    let sessionId = null;
    const { token } = readAccessToken(req);
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        sessionId = decoded.sid;
      } catch {
        // access may be expired — fall back to refresh cookie
      }
    }

    if (!sessionId) {
      const refreshToken = readRefreshToken(req);
      if (refreshToken) {
        const { hashToken } = require('../utils/tokenCrypto');
        const AuthSession = require('../models/AuthSession');
        const session = await AuthSession.findOne({
          refreshTokenHash: hashToken(refreshToken),
        }).select('_id userId');
        if (session) {
          sessionId = session._id;
        }
      }
    }

    if (sessionId) {
      await revokeSession(sessionId);
    }

    clearAuthCookies(res);
    securityLog('logout', {});
    res.json({ message: 'Logged out successfully.' });
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

    const origin = req.get('origin') || undefined;
    const result = await requestPasswordReset(email, { clientOrigin: origin });
    securityLog('password_reset_requested', {
      created: Boolean(result.created),
    });

    const body = { message: MSG.FORGOT_PASSWORD_SENT };
    if (result.debugToken) {
      body.debugResetToken = result.debugToken;
    }
    res.json(body);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = req.body?.password;
    const confirmPassword = req.body?.confirmPassword;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ message: MSG.FILL_REQUIRED_FIELDS });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: MSG.PASSWORDS_DO_NOT_MATCH });
    }

    const passwordCheck = validatePasswordValue(password);
    if (!passwordCheck.ok) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const result = await resetPasswordWithToken(token, passwordCheck.password);
    if (!result.ok) {
      return res.status(400).json({ message: 'Invalid or expired reset link.' });
    }

    clearAuthCookies(res);
    securityLog('password_reset_completed', { userId: String(result.userId) });
    res.json({ message: 'Password updated. Please sign in with your new password.' });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = req.body?.newPassword;
    const confirmPassword = req.body?.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: MSG.FILL_REQUIRED_FIELDS });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: MSG.PASSWORDS_DO_NOT_MATCH });
    }

    const passwordCheck = validatePasswordValue(newPassword);
    if (!passwordCheck.ok) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: MSG.INVALID_CREDENTIALS });
    }

    user.password = passwordCheck.password;
    await user.save();

    await revokeAllUserSessions(user._id);

    const sessionBundle = await createSession(user._id, {
      userAgent: req.get('user-agent') || '',
      ip: req.ip || req.socket?.remoteAddress || '',
    });

    const stats = user.role === 'ADMIN' ? null : await getUserStats(user._id);
    securityLog('password_change', { userId: String(user._id) });

    return attachSessionResponse(req, res, {
      accessToken: sessionBundle.accessToken,
      refreshToken: sessionBundle.refreshToken,
      user: user.toPublicJSON(stats),
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+aiKeys');
    const stats = user.role === 'ADMIN' ? null : await getUserStats(req.user._id);
    const csrfToken = issueCsrfToken();
    // Refresh CSRF cookie for clients that lost in-memory token after reload.
    res.cookie(
      require('../config/authCookies').CSRF_COOKIE,
      csrfToken,
      require('../config/authCookies').csrfCookieOptions(),
    );
    res.json({ user: user.toPublicJSON(stats), csrfToken });
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
        return res.status(400).json({
          message: 'Gemini API key looks too short. Paste the full key from Google AI Studio.',
        });
      }
      user.setAiKey('gemini', geminiApiKey);
    }

    if (openaiApiKey !== undefined) {
      if (openaiApiKey && String(openaiApiKey).trim().length < AI_KEY_MIN_LENGTH) {
        return res.status(400).json({
          message: 'ChatGPT API key looks too short. Paste the full key from OpenAI.',
        });
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
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateMe,
};
