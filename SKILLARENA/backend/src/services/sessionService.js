const crypto = require('crypto');
const AuthSession = require('../models/AuthSession');
const {
  generateOpaqueToken,
  hashToken,
} = require('../utils/tokenCrypto');
const { signAccessToken } = require('../utils/accessToken');
const { REFRESH_TTL_SECONDS } = require('../config/authCookies');

/** Grace window where concurrent refresh losers get INVALID instead of family-wide REUSE. */
const REFRESH_REUSE_GRACE_MS = Math.max(
  1000,
  Number(process.env.REFRESH_REUSE_GRACE_MS) || 30_000,
);

const hashIp = (ip) => {
  if (!ip) return '';
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 32);
};

const createSession = async (userId, { userAgent = '', ip = '' } = {}) => {
  const refreshToken = generateOpaqueToken(48);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

  const session = await AuthSession.create({
    userId,
    refreshTokenHash,
    expiresAt,
    userAgent: String(userAgent || '').slice(0, 300),
    ipHash: hashIp(ip),
    lastUsedAt: new Date(),
  });

  const accessToken = signAccessToken({ userId, sessionId: session._id });

  return {
    session,
    accessToken,
    refreshToken,
    expiresAt,
  };
};

const findActiveSessionByRefreshToken = async (refreshToken) => {
  if (!refreshToken) return null;
  const refreshTokenHash = hashToken(refreshToken);
  const session = await AuthSession.findOne({ refreshTokenHash });
  if (!session) return null;
  if (session.revokedAt) return session;
  if (session.expiresAt.getTime() <= Date.now()) return session;
  return session;
};

const revokeSession = async (sessionId, { reason } = {}) => {
  if (!sessionId) return null;
  return AuthSession.findByIdAndUpdate(
    sessionId,
    {
      $set: {
        revokedAt: new Date(),
        ...(reason ? { reuseDetectedAt: reason === 'reuse' ? new Date() : undefined } : {}),
      },
    },
    { new: true },
  );
};

const revokeAllUserSessions = async (userId) => {
  await AuthSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
};

/**
 * Rotate refresh token. Detects reuse of already-rotated/revoked tokens.
 * Uses an atomic claim so concurrent refreshes with the same token cannot all succeed.
 */
const rotateRefreshToken = async (presentedRefreshToken, { userAgent = '', ip = '' } = {}) => {
  if (!presentedRefreshToken) {
    return { ok: false, code: 'MISSING_REFRESH' };
  }

  const refreshTokenHash = hashToken(presentedRefreshToken);
  const now = new Date();

  // Atomically claim an active session — only one concurrent rotator wins.
  const claimed = await AuthSession.findOneAndUpdate(
    {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        revokedAt: now,
        lastUsedAt: now,
      },
    },
    { new: false },
  );

  if (!claimed) {
    const session = await AuthSession.findOne({ refreshTokenHash });
    if (!session) {
      return { ok: false, code: 'INVALID_REFRESH' };
    }
    if (session.expiresAt.getTime() <= Date.now() && !session.revokedAt) {
      session.revokedAt = new Date();
      await session.save();
      return { ok: false, code: 'EXPIRED_REFRESH' };
    }
    if (session.revokedAt) {
      const revokedAgeMs = Date.now() - new Date(session.revokedAt).getTime();
      // True reuse of an already-rotated token (outside concurrent grace window).
      if (session.replacedBySessionId && revokedAgeMs > REFRESH_REUSE_GRACE_MS) {
        await AuthSession.updateMany(
          { userId: session.userId, revokedAt: null },
          { $set: { revokedAt: new Date(), reuseDetectedAt: new Date() } },
        );
        await AuthSession.updateOne(
          { _id: session._id },
          { $set: { reuseDetectedAt: new Date() } },
        );
        return { ok: false, code: 'REFRESH_REUSE' };
      }
      // Lost a concurrent rotation race, or immediate duplicate present — do not family-revoke.
      return { ok: false, code: 'INVALID_REFRESH' };
    }
    return { ok: false, code: 'INVALID_REFRESH' };
  }

  const nextRefreshToken = generateOpaqueToken(48);
  const nextHash = hashToken(nextRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

  const nextSession = await AuthSession.create({
    userId: claimed.userId,
    refreshTokenHash: nextHash,
    expiresAt,
    userAgent: String(userAgent || claimed.userAgent || '').slice(0, 300),
    ipHash: hashIp(ip) || claimed.ipHash,
    lastUsedAt: new Date(),
  });

  await AuthSession.updateOne(
    { _id: claimed._id },
    {
      $set: {
        replacedBySessionId: nextSession._id,
        lastUsedAt: new Date(),
      },
    },
  );

  const accessToken = signAccessToken({
    userId: claimed.userId,
    sessionId: nextSession._id,
  });

  return {
    ok: true,
    userId: claimed.userId,
    session: nextSession,
    accessToken,
    refreshToken: nextRefreshToken,
    expiresAt,
  };
};

const isSessionActive = async (sessionId) => {
  if (!sessionId) return false;
  const session = await AuthSession.findById(sessionId).select('revokedAt expiresAt').lean();
  if (!session) return false;
  if (session.revokedAt) return false;
  if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) return false;
  return true;
};

module.exports = {
  createSession,
  findActiveSessionByRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  rotateRefreshToken,
  isSessionActive,
  hashIp,
};
