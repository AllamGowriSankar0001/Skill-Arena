/**
 * Safe parsing helpers for query/body inputs.
 * Prevents NaN/Infinity abuse and MongoDB operator-style objects in query params.
 */

const asPlainString = (value, { maxLength = 200 } = {}) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value, { defaultValue, min = 1, max = 100 } = {}) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'object') {
    return defaultValue;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, parsed));
};

const isValidObjectIdString = (value) =>
  typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);

module.exports = {
  asPlainString,
  escapeRegex,
  parsePositiveInt,
  isValidObjectIdString,
};
