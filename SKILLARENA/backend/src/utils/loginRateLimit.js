const MSG = require('../constants/authMessages');

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const attempts = new Map();

const getKey = (email, ip) => `${String(email || '').toLowerCase()}::${ip || 'unknown'}`;

const getState = (key) => {
  const state = attempts.get(key);
  if (!state) return null;

  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    attempts.delete(key);
    return null;
  }

  return state;
};

const checkLoginAllowed = (email, ip) => {
  const key = getKey(email, ip);
  const state = getState(key);

  if (state?.lockedUntil && Date.now() < state.lockedUntil) {
    const retryAfterSeconds = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    return {
      allowed: false,
      message: MSG.LOGIN_RATE_LIMIT,
      retryAfterSeconds,
    };
  }

  return { allowed: true };
};

const recordFailedLogin = (email, ip) => {
  const key = getKey(email, ip);
  const state = getState(key) || { count: 0, lockedUntil: null };
  state.count += 1;

  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCK_DURATION_MS;
    state.count = 0;
  }

  attempts.set(key, state);
};

const clearLoginAttempts = (email, ip) => {
  attempts.delete(getKey(email, ip));
};

module.exports = {
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
};
