const jwt = require('jsonwebtoken');
const { ACCESS_TTL_SECONDS } = require('../config/authCookies');

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = process.env.JWT_ISSUER || 'skillarena';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'skillarena-web';

/**
 * Short-lived access JWT. Identity comes from `id`; `sid` binds to AuthSession.
 * No DB lookup required on each request when only verifying signature/expiry.
 */
const signAccessToken = ({ userId, sessionId }) => {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(
    {
      id: String(userId),
      sid: String(sessionId),
      typ: 'access',
    },
    secret,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: ACCESS_TTL_SECONDS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
};

const verifyAccessToken = (token) => {
  const secret = process.env.JWT_SECRET;
  const decoded = jwt.verify(token, secret, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (!decoded || decoded.typ !== 'access' || !decoded.id || !decoded.sid) {
    const error = new Error('Invalid access token');
    error.name = 'JsonWebTokenError';
    throw error;
  }

  return decoded;
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
  JWT_ALGORITHM,
  JWT_ISSUER,
  JWT_AUDIENCE,
  ACCESS_TTL_SECONDS,
};
