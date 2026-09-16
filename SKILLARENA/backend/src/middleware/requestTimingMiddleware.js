const { runWithPerfContext, getPerfContext } = require('../utils/perfContext');

/**
 * Lightweight request timing for development/staging.
 * Enable with PERF_LOG=1. Disabled by default in production unless PERF_LOG=1.
 * Never logs Authorization headers, bodies, tokens, or user PII.
 */
const isPerfEnabled = () => {
  if (process.env.PERF_LOG === '0') return false;
  if (process.env.PERF_LOG === '1') return true;
  return String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
};

const shouldSamplePath = (path) => {
  const interesting = [
    '/api/learning/practice',
    '/api/platform/courses/',
    '/api/home',
    '/api/learning/community/meta',
    '/api/learning/leaderboard',
    '/api/admin/',
    '/api/learning/lessons/',
    '/api/learning/courses/',
  ];
  return interesting.some((prefix) => path.startsWith(prefix) || path.includes(prefix.replace(/\/$/, '')));
};

const requestTimingMiddleware = (req, res, next) => {
  if (!isPerfEnabled()) {
    return next();
  }

  return runWithPerfContext(() => {
    const started = process.hrtime.bigint();
    let responseBytes = 0;

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = (chunk, encoding, callback) => {
      if (chunk) {
        responseBytes += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding || 'utf8');
      }
      return originalWrite(chunk, encoding, callback);
    };

    res.end = (chunk, encoding, callback) => {
      if (chunk) {
        responseBytes += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(String(chunk), encoding || 'utf8');
      }
      return originalEnd(chunk, encoding, callback);
    };

    res.on('finish', () => {
      const path = req.originalUrl?.split('?')[0] || req.path || '';
      if (!shouldSamplePath(path) && process.env.PERF_LOG !== '1') {
        return;
      }

      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      const ctx = getPerfContext();

      console.info('[perf]', {
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Math.round(elapsedMs * 100) / 100,
        responseBytes,
        mongoQueries: ctx?.queryCount ?? null,
        mongoOpsSample: ctx?.ops?.slice(0, 12) ?? null,
        spans: ctx?.spans?.length ? ctx.spans : null,
      });
    });

    next();
  });
};

module.exports = {
  requestTimingMiddleware,
  isPerfEnabled,
};
