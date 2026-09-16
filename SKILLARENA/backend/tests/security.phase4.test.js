/**
 * Phase 4 authentication / session security tests.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'phase4-test-secret-at-least-32-chars-long!!';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'skillarena';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'skillarena-web';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const mongoose = require('mongoose');
const { hashToken, generateOpaqueToken } = require('../src/utils/tokenCrypto');
const { signAccessToken, verifyAccessToken } = require('../src/utils/accessToken');
const {
  accessCookieOptions,
  refreshCookieOptions,
  csrfCookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
} = require('../src/config/authCookies');
const { csrfProtection } = require('../src/middleware/csrfMiddleware');
const {
  isBrowserCookieClient,
  shouldReturnTokensInBody,
} = require('../src/utils/authClientKind');
const {
  createSession,
  rotateRefreshToken,
  revokeSession,
} = require('../src/services/sessionService');
const { requestPasswordReset, resetPasswordWithToken } = require('../src/services/passwordResetService');
const PasswordResetToken = require('../src/models/PasswordResetToken');
const AuthSession = require('../src/models/AuthSession');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

describe('auth client kind (web vs native token body)', () => {
  test('browser Origin allowlist is cookie client (no tokens needed in JSON)', () => {
    const req = {
      get: (name) => {
        const key = String(name).toLowerCase();
        if (key === 'origin') return 'http://localhost:5173';
        return undefined;
      },
    };
    assert.equal(isBrowserCookieClient(req), true);
    assert.equal(shouldReturnTokensInBody(req), false);
  });

  test('Sec-Fetch-* marks browser cookie client', () => {
    const req = {
      get: (name) => (String(name).toLowerCase() === 'sec-fetch-mode' ? 'cors' : undefined),
    };
    assert.equal(isBrowserCookieClient(req), true);
    assert.equal(shouldReturnTokensInBody(req), false);
  });

  test('native client without Origin/Sec-Fetch receives tokens in body', () => {
    const req = { get: () => undefined };
    assert.equal(isBrowserCookieClient(req), false);
    assert.equal(shouldReturnTokensInBody(req), true);
  });
});

describe('token crypto', () => {
  test('hashes are deterministic and do not equal raw tokens', () => {
    const raw = generateOpaqueToken(32);
    const a = hashToken(raw);
    const b = hashToken(raw);
    assert.equal(a, b);
    assert.notEqual(a, raw);
    assert.equal(a.length, 64);
  });
});

describe('access JWT', () => {
  test('signs and verifies with explicit algorithm and claims', () => {
    const token = signAccessToken({ userId: '507f1f77bcf86cd799439011', sessionId: '507f1f77bcf86cd799439012' });
    const decoded = verifyAccessToken(token);
    assert.equal(decoded.id, '507f1f77bcf86cd799439011');
    assert.equal(decoded.sid, '507f1f77bcf86cd799439012');
    assert.equal(decoded.typ, 'access');
  });

  test('rejects malformed tokens', () => {
    assert.throws(() => verifyAccessToken('not-a-jwt'));
  });

  test('rejects tokens without typ/sid', () => {
    const jwt = require('jsonwebtoken');
    const bad = jwt.sign({ id: 'x' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: 60,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });
    assert.throws(() => verifyAccessToken(bad));
  });
});

describe('cookie security attributes', () => {
  test('access and refresh cookies are HttpOnly', () => {
    assert.equal(accessCookieOptions().httpOnly, true);
    assert.equal(refreshCookieOptions().httpOnly, true);
    assert.equal(csrfCookieOptions().httpOnly, false);
    assert.ok(ACCESS_COOKIE);
    assert.ok(REFRESH_COOKIE);
    assert.ok(CSRF_COOKIE);
  });

  test('production enables Secure cookies by default', () => {
    const previous = process.env.NODE_ENV;
    const previousSecure = process.env.COOKIE_SECURE;
    const previousSameSite = process.env.COOKIE_SAMESITE;
    process.env.NODE_ENV = 'production';
    delete process.env.COOKIE_SECURE;
    delete process.env.COOKIE_SAMESITE;
    // Re-require is unnecessary — authCookies reads env at call time via isProduction().
    assert.equal(accessCookieOptions().secure, true);
    assert.equal(refreshCookieOptions().secure, true);
    assert.equal(csrfCookieOptions().secure, true);
    assert.equal(accessCookieOptions().sameSite, 'None');
    process.env.NODE_ENV = previous;
    if (previousSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = previousSecure;
    if (previousSameSite === undefined) delete process.env.COOKIE_SAMESITE;
    else process.env.COOKIE_SAMESITE = previousSameSite;
  });
});

describe('CSRF middleware', () => {
  const run = (req) =>
    new Promise((resolve) => {
      const res = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.body = payload;
          resolve({ status: this.statusCode, body: payload });
          return this;
        },
      };
      csrfProtection(req, res, () => resolve({ status: 200, body: { ok: true } }));
    });

  test('allows GET without CSRF', async () => {
    const result = await run({ method: 'GET', originalUrl: '/api/home', get: () => null, cookies: {} });
    assert.equal(result.status, 200);
  });

  test('allows login bootstrap POST without CSRF', async () => {
    const result = await run({
      method: 'POST',
      originalUrl: '/api/auth/login',
      get: () => null,
      cookies: {},
    });
    assert.equal(result.status, 200);
  });

  test('rejects state-changing request without origin or CSRF pair', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const result = await run({
      method: 'POST',
      originalUrl: '/api/learning/practice',
      headers: {},
      get: () => null,
      cookies: {},
    });
    process.env.NODE_ENV = previous;
    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'CSRF_INVALID');
  });

  test('allows when CSRF cookie matches header', async () => {
    const result = await run({
      method: 'PATCH',
      originalUrl: '/api/auth/me',
      headers: {},
      get: (name) => (name.toLowerCase() === 'x-csrf-token' ? 'abc' : null),
      cookies: { [CSRF_COOKIE]: 'abc' },
    });
    assert.equal(result.status, 200);
  });

  test('allows Bearer-authenticated mutating requests without CSRF', async () => {
    const result = await run({
      method: 'POST',
      originalUrl: '/api/learning/practice',
      headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig' },
      get: () => null,
      cookies: {},
    });
    assert.equal(result.status, 200);
  });
});

describe('CORS / origin allowlist', () => {
  test('allowlisted origin is accepted; unknown origin is rejected', () => {
    // Uses the same CLIENT_URL parser as CSRF (mirrors server CORS allowlist intent).
    const previous = process.env.CLIENT_URL;
    const previousClients = process.env.CLIENT_URLS;
    const previousNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_URL = 'https://app.example.com';
    delete process.env.CLIENT_URLS;

    // Re-load module so parseAllowedOrigins picks up env (module caches at load).
    delete require.cache[require.resolve('../src/middleware/csrfMiddleware')];
    const csrf = require('../src/middleware/csrfMiddleware');
    assert.equal(csrf.isOriginAllowed('https://app.example.com'), true);
    assert.equal(csrf.isOriginAllowed('https://evil.example'), false);
    assert.equal(csrf.isOriginAllowed(null), false);

    process.env.CLIENT_URL = previous;
    process.env.NODE_ENV = previousNode;
    if (previousClients === undefined) delete process.env.CLIENT_URLS;
    else process.env.CLIENT_URLS = previousClients;
    delete require.cache[require.resolve('../src/middleware/csrfMiddleware')];
    require('../src/middleware/csrfMiddleware');
  });
});

describe('session + password reset (mongo)', () => {
  let user;

  before(async () => {
    await connectDB();
    const email = `phase4_${Date.now()}@example.com`;
    user = await User.create({
      name: 'Phase Four',
      email,
      password: 'Secret1@',
    });
  });

  after(async () => {
    if (user?._id) {
      await AuthSession.deleteMany({ userId: user._id });
      await PasswordResetToken.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    await mongoose.disconnect();
  });

  test('creates session with hashed refresh token only', async () => {
    const bundle = await createSession(user._id, { userAgent: 'test', ip: '127.0.0.1' });
    assert.ok(bundle.accessToken);
    assert.ok(bundle.refreshToken);
    const stored = await AuthSession.findById(bundle.session._id).lean();
    assert.equal(stored.refreshTokenHash, hashToken(bundle.refreshToken));
    assert.notEqual(stored.refreshTokenHash, bundle.refreshToken);
    assert.equal(stored.revokedAt, null);
  });

  test('rotates refresh token and rejects reuse', async () => {
    const first = await createSession(user._id);
    const rotated = await rotateRefreshToken(first.refreshToken);
    assert.equal(rotated.ok, true);
    assert.notEqual(rotated.refreshToken, first.refreshToken);

    // Immediate re-present (incl. concurrent race loser) is rejected without family revoke code path requiring grace.
    const immediate = await rotateRefreshToken(first.refreshToken);
    assert.equal(immediate.ok, false);
    assert.ok(
      immediate.code === 'INVALID_REFRESH' || immediate.code === 'REFRESH_REUSE',
      immediate.code,
    );

    // Past grace window, presenting the rotated token is treated as reuse.
    await AuthSession.updateOne(
      { _id: first.session._id },
      { $set: { revokedAt: new Date(Date.now() - 60_000) } },
    );
    const reuse = await rotateRefreshToken(first.refreshToken);
    assert.equal(reuse.ok, false);
    assert.equal(reuse.code, 'REFRESH_REUSE');
  });

  test('concurrent refresh with same token allows only one success', async () => {
    const first = await createSession(user._id);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => rotateRefreshToken(first.refreshToken)),
    );
    const wins = results.filter((r) => r.ok);
    const losses = results.filter((r) => !r.ok);
    assert.equal(wins.length, 1, `expected 1 win, got ${wins.length}`);
    assert.equal(losses.length, 7);
    assert.ok(losses.every((r) => r.code === 'INVALID_REFRESH' || r.code === 'REFRESH_REUSE'));

    // Winner session remains usable.
    const follow = await rotateRefreshToken(wins[0].refreshToken);
    assert.equal(follow.ok, true);
  });

  test('revoked session cannot rotate', async () => {
    const bundle = await createSession(user._id);
    await revokeSession(bundle.session._id);
    const result = await rotateRefreshToken(bundle.refreshToken);
    assert.equal(result.ok, false);
  });

  test('password reset stores hash and works once', async () => {
    process.env.AUTH_DEBUG_RESET_TOKEN = '1';
    const requested = await requestPasswordReset(user.email, {
      clientOrigin: 'http://localhost:5173',
    });
    assert.equal(requested.created, true);
    assert.ok(requested.debugToken);

    const records = await PasswordResetToken.find({ userId: user._id }).lean();
    assert.ok(records.length >= 1);
    assert.equal(records.at(-1).tokenHash, hashToken(requested.debugToken));
    assert.notEqual(records.at(-1).tokenHash, requested.debugToken);

    const ok = await resetPasswordWithToken(requested.debugToken, 'NewPass1@');
    assert.equal(ok.ok, true);

    const reused = await resetPasswordWithToken(requested.debugToken, 'NewPass2@');
    assert.equal(reused.ok, false);

    const activeSessions = await AuthSession.countDocuments({
      userId: user._id,
      revokedAt: null,
    });
    assert.equal(activeSessions, 0);

    delete process.env.AUTH_DEBUG_RESET_TOKEN;
  });

  test('forgot password does not reveal missing accounts', async () => {
    const result = await requestPasswordReset('missing-user-phase4@example.com');
    assert.equal(result.created, false);
  });
});
