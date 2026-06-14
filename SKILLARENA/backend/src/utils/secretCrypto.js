const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

const getEncryptionKey = () => {
  const secret = process.env.AI_KEYS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('AI_KEYS_SECRET or JWT_SECRET must be configured to store API keys.');
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const encryptSecret = (plaintext = '') => {
  const value = String(plaintext || '').trim();
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
};

const decryptSecret = (payload) => {
  if (!payload?.ciphertext || !payload?.iv || !payload?.tag) return null;

  try {
    const decipher = crypto.createDecipheriv(
      ALGO,
      getEncryptionKey(),
      Buffer.from(payload.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
};

module.exports = {
  encryptSecret,
  decryptSecret,
};
