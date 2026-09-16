const crypto = require('crypto');

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');

const generateOpaqueToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

module.exports = {
  hashToken,
  generateOpaqueToken,
};
