const { decryptSecret } = require('./secretCrypto');
const { hasStoredKey } = require('./aiKeyStorage');

const getUserModel = () => require('../models/User');

const readUserKey = (payload) => {
  if (!hasStoredKey(payload)) return null;
  const key = decryptSecret(payload);
  return key?.trim() ? key.trim() : null;
};

const getServerGeminiKeys = () => {
  const keys = [];

  for (let index = 1; index <= 10; index += 1) {
    const envName = index === 1 ? 'GEMINI_API_KEY' : `GEMINI_API_KEY_${index}`;
    const value = String(process.env[envName] || '').trim();
    if (value) keys.push(value);
  }

  const bulk = process.env.GEMINI_API_KEYS;
  if (bulk) {
    bulk.split(/[\n,]+/).forEach((entry) => {
      const value = entry.trim();
      if (value) keys.push(value);
    });
  }

  return [...new Set(keys)];
};

const resolveUserAiKeyChain = async (userId) => {
  const chain = [];
  let user = null;

  if (userId) {
    const User = getUserModel();
    user = await User.findById(userId).select('+aiKeys');
    const geminiKey = readUserKey(user?.aiKeys?.gemini);
    if (geminiKey) chain.push({ provider: 'gemini', key: geminiKey, source: 'user' });
  }

  getServerGeminiKeys().forEach((key, index) => {
    chain.push({
      provider: 'gemini',
      key,
      source: index === 0 ? 'server' : `server-${index + 1}`,
    });
  });

  const openaiKey = readUserKey(user?.aiKeys?.openai);
  if (openaiKey) chain.push({ provider: 'openai', key: openaiKey, source: 'user' });

  return chain;
};

const userHasOwnAiKeys = async (userId) => {
  if (!userId) return false;
  const User = getUserModel();
  const user = await User.findById(userId).select('+aiKeys');
  return hasStoredKey(user?.aiKeys?.gemini) || hasStoredKey(user?.aiKeys?.openai);
};

module.exports = {
  resolveUserAiKeyChain,
  userHasOwnAiKeys,
};
