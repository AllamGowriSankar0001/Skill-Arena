const { generateOpaqueToken } = require('../utils/tokenCrypto');
const {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  csrfCookieOptions,
  clearCookieOptions,
  clearCsrfCookieOptions,
} = require('../config/authCookies');

const setAuthCookies = (res, { accessToken, refreshToken, csrfToken }) => {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions());
};

const clearAuthCookies = (res) => {
  res.cookie(ACCESS_COOKIE, '', clearCookieOptions());
  res.cookie(REFRESH_COOKIE, '', clearCookieOptions());
  res.cookie(CSRF_COOKIE, '', clearCsrfCookieOptions());
};

const issueCsrfToken = () => generateOpaqueToken(24);

const readAccessToken = (req) => {
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (fromCookie) return { token: fromCookie, source: 'cookie' };

  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    // Temporary dual support for mobile/scripts — same short-lived access JWT only.
    return { token: header.slice(7), source: 'bearer' };
  }
  return { token: null, source: null };
};

const readRefreshToken = (req) => {
  if (req.cookies?.[REFRESH_COOKIE]) return req.cookies[REFRESH_COOKIE];
  // Temporary mobile body support for refresh.
  if (req.body?.refreshToken && typeof req.body.refreshToken === 'string') {
    return req.body.refreshToken;
  }
  return null;
};

module.exports = {
  setAuthCookies,
  clearAuthCookies,
  issueCsrfToken,
  readAccessToken,
  readRefreshToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
};
