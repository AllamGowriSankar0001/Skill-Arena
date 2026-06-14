const hasStoredKey = (payload) => Boolean(payload?.ciphertext && payload?.iv && payload?.tag);

module.exports = {
  hasStoredKey,
};
