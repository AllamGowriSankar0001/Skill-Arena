const PasswordResetToken = require('../models/PasswordResetToken');
const User = require('../models/User');
const { generateOpaqueToken, hashToken } = require('../utils/tokenCrypto');
const { revokeAllUserSessions } = require('./sessionService');
const { sendPasswordResetEmail } = require('./emailService');

const RESET_TTL_MS = Number(process.env.PASSWORD_RESET_TTL_MS) || 60 * 60 * 1000; // 1 hour

const requestPasswordReset = async (email, { clientOrigin } = {}) => {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({
    email: normalized,
    status: { $nin: ['BLOCKED', 'DELETED'] },
  }).select('_id email');

  // Always return the same outcome to the controller (no account enumeration).
  if (!user) {
    return { created: false };
  }

  // Invalidate prior unused tokens for this user.
  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  const rawToken = generateOpaqueToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
  });

  const origin =
    clientOrigin ||
    process.env.CLIENT_URL?.split(',')[0]?.trim() ||
    'http://localhost:5173';
  const resetUrl = `${origin.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
  });

  return {
    created: true,
    // Only for automated tests when explicitly enabled — never for normal clients.
    debugToken:
      process.env.AUTH_DEBUG_RESET_TOKEN === '1' &&
      String(process.env.NODE_ENV || '').toLowerCase() !== 'production'
        ? rawToken
        : undefined,
  };
};

const resetPasswordWithToken = async (rawToken, newPassword) => {
  if (!rawToken || !newPassword) {
    return { ok: false, code: 'INVALID' };
  }

  const tokenHash = hashToken(rawToken);
  const record = await PasswordResetToken.findOne({ tokenHash });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return { ok: false, code: 'INVALID_OR_EXPIRED' };
  }

  const user = await User.findById(record.userId).select('+password');
  if (!user || user.status === 'BLOCKED' || user.status === 'DELETED') {
    return { ok: false, code: 'INVALID_OR_EXPIRED' };
  }

  user.password = newPassword;
  await user.save();

  record.usedAt = new Date();
  await record.save();

  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  await revokeAllUserSessions(user._id);

  return { ok: true, userId: user._id };
};

module.exports = {
  requestPasswordReset,
  resetPasswordWithToken,
  RESET_TTL_MS,
};
