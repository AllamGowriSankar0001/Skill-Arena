const express = require('express');
const {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateMe,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { createRateLimiter, getClientIp } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many signup attempts. Please try again later.',
  code: 'SIGNUP_RATE_LIMIT',
  keyGenerator: (req) => `signup::${getClientIp(req)}`,
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login attempts from this network. Please try again later.',
  code: 'LOGIN_IP_RATE_LIMIT',
  keyGenerator: (req) => `login-ip::${getClientIp(req)}`,
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.',
  code: 'FORGOT_PASSWORD_RATE_LIMIT',
  keyGenerator: (req) => `forgot::${getClientIp(req)}`,
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts. Please try again later.',
  code: 'RESET_PASSWORD_RATE_LIMIT',
  keyGenerator: (req) => `reset::${getClientIp(req)}`,
});

const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many session refresh attempts. Please try again later.',
  code: 'REFRESH_RATE_LIMIT',
  keyGenerator: (req) => `refresh::${getClientIp(req)}`,
});

const changePasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many password change attempts. Please try again later.',
  code: 'CHANGE_PASSWORD_RATE_LIMIT',
  keyGenerator: (req) => `change-password::${getClientIp(req)}`,
});

router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.post('/change-password', authMiddleware, changePasswordLimiter, changePassword);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);

module.exports = router;
