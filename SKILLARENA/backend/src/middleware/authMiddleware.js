const User = require('../models/User');
const { verifyAccessToken } = require('../utils/accessToken');
const { readAccessToken } = require('../utils/authCookies');

const authMiddleware = async (req, res, next) => {
  try {
    const { token, source } = readAccessToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Not authorized. No token provided.' });
    }

    if (token.length > 4096) {
      return res.status(401).json({ message: 'Not authorized. Invalid token.' });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ message: 'Not authorized. Invalid token.' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Not authorized. User not found.' });
    }

    if (user.status === 'BLOCKED' || user.status === 'DELETED') {
      return res.status(403).json({ message: 'This account is not active.' });
    }

    req.user = user;
    req.auth = {
      sessionId: decoded.sid,
      tokenSource: source,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized. Invalid token.' });
  }
};

module.exports = authMiddleware;
