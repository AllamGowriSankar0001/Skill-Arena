/**
 * In-memory rate limiter for high-risk endpoints.
 * NOTE: Per-process only — Redis/shared store is deferred to a later phase.
 */

const buckets = new Map();

const getClientIp = (req) =>
  req.ip || req.socket?.remoteAddress || 'unknown';

const cleanupExpired = (key, now) => {
  const entry = buckets.get(key);
  if (!entry) return null;
  if (now >= entry.resetAt) {
    buckets.delete(key);
    return null;
  }
  return entry;
};

/**
 * @param {object} options
 * @param {number} options.windowMs
 * @param {number} options.max
 * @param {function} [options.keyGenerator]
 * @param {string} [options.message]
 * @param {string} [options.code]
 */
const createRateLimiter = ({
  windowMs,
  max,
  keyGenerator,
  message = 'Too many requests. Please try again later.',
  code = 'RATE_LIMIT',
}) => {
  const resolveKey =
    keyGenerator ||
    ((req) => `${req.baseUrl}${req.path}::${getClientIp(req)}`);

  return (req, res, next) => {
    const now = Date.now();
    const key = resolveKey(req);
    let entry = cleanupExpired(key, now);

    if (!entry) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    entry.count += 1;

    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message,
        code,
        retryAfterSeconds,
      });
    }

    return next();
  };
};

module.exports = {
  createRateLimiter,
  getClientIp,
};
