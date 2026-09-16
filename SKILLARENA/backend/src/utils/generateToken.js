/**
 * @deprecated Use utils/accessToken.signAccessToken via sessionService.
 * Kept so any legacy require() does not crash during migration.
 */
const { signAccessToken } = require('./accessToken');

const generateToken = (userId, sessionId = 'legacy') =>
  signAccessToken({ userId, sessionId });

module.exports = generateToken;
