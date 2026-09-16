/**
 * Origin/Referer allowlist CSRF for cookie-authenticated mutating requests,
 * plus optional double-submit X-CSRF-Token matching sa_csrf cookie.
 */
const { CSRF_COOKIE } = require('../config/authCookies');
const { isProduction } = require('../config/secureEnv');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const parseAllowedOrigins = () => {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL;
  if (!raw || !String(raw).trim()) {
    if (isProduction()) return [];
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  if (String(raw).trim() === '*') {
    return isProduction() ? [] : null; // null = allow any in dev
  }
  return String(raw)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

const getRequestOrigin = (req) => {
  const origin = req.get('origin');
  if (origin) return origin;
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const isOriginAllowed = (origin) => {
  if (!origin) return false;
  if (allowedOrigins === null) return true;
  return Array.isArray(allowedOrigins) && allowedOrigins.includes(origin);
};

const isAuthBootstrapPath = (req) => {
  const full = req.originalUrl || req.path || '';
  return [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/auth/logout',
  ].some((prefix) => full.includes(prefix));
};

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Native mobile / API clients authenticate with Bearer access JWTs.
  // CSRF targets cookie-authenticated browsers; Bearer requests are exempt.
  const authorization = req.headers?.authorization || '';
  if (String(authorization).startsWith('Bearer ')) {
    return next();
  }

  if (isAuthBootstrapPath(req)) {
    return next();
  }

  const origin = getRequestOrigin(req);
  const originOk = isOriginAllowed(origin);

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  const csrfOk = Boolean(cookieToken && headerToken && cookieToken === headerToken);

  if (csrfOk) {
    return next();
  }

  if (originOk) {
    return next();
  }

  if (!origin && !isProduction() && !cookieToken) {
    return next();
  }

  return res.status(403).json({
    message: 'Invalid or missing CSRF token.',
    code: 'CSRF_INVALID',
  });
};

module.exports = {
  csrfProtection,
  isOriginAllowed,
  getRequestOrigin,
};
