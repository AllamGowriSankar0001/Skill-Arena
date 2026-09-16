const { isProduction } = require('./secureEnv');

const ACCESS_COOKIE = 'sa_access';
const REFRESH_COOKIE = 'sa_refresh';
const CSRF_COOKIE = 'sa_csrf';

const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 15 * 60; // 15m
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 14 * 24 * 60 * 60; // 14d
const CSRF_TTL_SECONDS = REFRESH_TTL_SECONDS;

const cookieBase = ({ maxAgeMs }) => {
  const production = isProduction();
  const sameSiteEnv = String(process.env.COOKIE_SAMESITE || '').toLowerCase();
  // Cross-site SPA (e.g. Vercel → API host) needs SameSite=None; Secure required with None.
  const sameSite =
    sameSiteEnv === 'none' || sameSiteEnv === 'lax' || sameSiteEnv === 'strict'
      ? sameSiteEnv.charAt(0).toUpperCase() + sameSiteEnv.slice(1)
      : production
        ? 'None'
        : 'Lax';

  const secure =
    process.env.COOKIE_SECURE === '1' ||
    process.env.COOKIE_SECURE === 'true' ||
    (production && sameSite === 'None') ||
    (production && process.env.COOKIE_SECURE !== '0');

  return {
    httpOnly: true,
    secure: Boolean(secure),
    sameSite,
    path: '/',
    maxAge: maxAgeMs,
  };
};

const accessCookieOptions = () =>
  cookieBase({ maxAgeMs: ACCESS_TTL_SECONDS * 1000 });

const refreshCookieOptions = () =>
  cookieBase({ maxAgeMs: REFRESH_TTL_SECONDS * 1000 });

const csrfCookieOptions = () => {
  const base = cookieBase({ maxAgeMs: CSRF_TTL_SECONDS * 1000 });
  return {
    ...base,
    httpOnly: false, // double-submit: JS must read and echo in X-CSRF-Token
  };
};

const clearCookieOptions = () => {
  const base = cookieBase({ maxAgeMs: 0 });
  return {
    httpOnly: true,
    secure: base.secure,
    sameSite: base.sameSite,
    path: '/',
    maxAge: 0,
  };
};

const clearCsrfCookieOptions = () => ({
  ...clearCookieOptions(),
  httpOnly: false,
});

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  accessCookieOptions,
  refreshCookieOptions,
  csrfCookieOptions,
  clearCookieOptions,
  clearCsrfCookieOptions,
};
