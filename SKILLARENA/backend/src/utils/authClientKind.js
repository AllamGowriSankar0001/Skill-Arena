/**
 * Distinguish browser cookie clients from native/mobile Bearer clients.
 *
 * Phase 5B: There is no X-Client-Type header. Detection uses browser fetch metadata:
 * - Sec-Fetch-* headers (sent by modern browsers)
 * - Allowlisted Origin/Referer (CORS SPA)
 *
 * React Native typically sends neither → treated as native (tokens in JSON).
 */
const { getRequestOrigin, isOriginAllowed } = require('../middleware/csrfMiddleware');

const isBrowserCookieClient = (req) => {
  if (!req || typeof req.get !== 'function') {
    return false;
  }

  // Browser Fetch Metadata Request Headers — not sent by React Native.
  if (req.get('sec-fetch-site') || req.get('sec-fetch-mode') || req.get('sec-fetch-dest')) {
    return true;
  }

  const origin = getRequestOrigin(req);
  if (origin && isOriginAllowed(origin)) {
    return true;
  }

  return false;
};

/** Native / non-browser clients need access+refresh in the JSON body for SecureStore. */
const shouldReturnTokensInBody = (req) => !isBrowserCookieClient(req);

module.exports = {
  isBrowserCookieClient,
  shouldReturnTokensInBody,
};
