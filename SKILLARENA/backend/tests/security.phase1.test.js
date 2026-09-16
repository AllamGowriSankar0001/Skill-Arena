const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { asPlainString, escapeRegex, parsePositiveInt } = require('../src/utils/safeInput');
const { runCodingTests, MAX_JS_CHARS } = require('../src/services/codingTestRunner');
const { assertSecureEnv } = require('../src/config/secureEnv');

describe('safeInput', () => {
  test('rejects object-style query values for strings', () => {
    assert.equal(asPlainString({ $gt: '' }), '');
    assert.equal(asPlainString(['x']), '');
    assert.equal(asPlainString('  hello  '), 'hello');
  });

  test('escapes regex metacharacters', () => {
    assert.equal(escapeRegex('a+b.*(c)'), 'a\\+b\\.\\*\\(c\\)');
  });

  test('clamps pagination limits and ignores NaN/objects', () => {
    assert.equal(parsePositiveInt('9999', { defaultValue: 25, max: 100 }), 100);
    assert.equal(parsePositiveInt('-5', { defaultValue: 25, max: 100 }), 1);
    assert.equal(parsePositiveInt('NaN', { defaultValue: 25, max: 100 }), 25);
    assert.equal(parsePositiveInt({ $gt: 0 }, { defaultValue: 25, max: 100 }), 25);
    assert.equal(parsePositiveInt(undefined, { defaultValue: 25, max: 100 }), 25);
  });
});

describe('codingTestRunner hardening', () => {
  test('rejects oversized javascript payloads', async () => {
    await assert.rejects(
      () =>
        runCodingTests(
          {
            html: '',
            css: '',
            javascript: 'x'.repeat(MAX_JS_CHARS + 1),
          },
          [],
        ),
      (error) => error.code === 'CODE_TOO_LARGE' && error.statusCode === 400,
    );
  });

  test('does not crash the process on invalid selectors', async () => {
    const result = await runCodingTests(
      { html: '<p>ok</p>', css: '', javascript: '' },
      [{ type: 'ELEMENT_EXISTS', selector: '[[[invalid' }],
    );
    assert.equal(result.passedCount, 0);
  });
});

describe('secureEnv JWT_SECRET', () => {
  test('fails when JWT_SECRET is missing', () => {
    const previous = process.env.JWT_SECRET;
    const previousNodeEnv = process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    assert.throws(() => assertSecureEnv(), /JWT_SECRET is required/);
    process.env.JWT_SECRET = previous;
    process.env.NODE_ENV = previousNodeEnv;
  });

  test('fails in production for short JWT_SECRET', () => {
    const previous = process.env.JWT_SECRET;
    const previousNodeEnv = process.env.NODE_ENV;
    const previousClient = process.env.CLIENT_URL;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'too-short';
    process.env.CLIENT_URL = 'https://example.com';
    assert.throws(() => assertSecureEnv(), /at least 32 characters/);
    process.env.JWT_SECRET = previous;
    process.env.NODE_ENV = previousNodeEnv;
    process.env.CLIENT_URL = previousClient;
  });

  test('fails in production when CLIENT_URL is wildcard', () => {
    const previous = process.env.JWT_SECRET;
    const previousNodeEnv = process.env.NODE_ENV;
    const previousClient = process.env.CLIENT_URL;
    const previousClients = process.env.CLIENT_URLS;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.CLIENT_URL = '*';
    delete process.env.CLIENT_URLS;
    assert.throws(() => assertSecureEnv(), /explicit comma-separated origin allowlist/);
    process.env.JWT_SECRET = previous;
    process.env.NODE_ENV = previousNodeEnv;
    process.env.CLIENT_URL = previousClient;
    if (previousClients === undefined) delete process.env.CLIENT_URLS;
    else process.env.CLIENT_URLS = previousClients;
  });

  test('fails in production when AUTH_DEBUG_RESET_TOKEN is enabled', () => {
    const previous = process.env.JWT_SECRET;
    const previousNodeEnv = process.env.NODE_ENV;
    const previousClient = process.env.CLIENT_URL;
    const previousDebug = process.env.AUTH_DEBUG_RESET_TOKEN;
    const previousMongo = process.env.MONGODB_URI;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.CLIENT_URL = 'https://example.com';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    process.env.AUTH_DEBUG_RESET_TOKEN = '1';
    assert.throws(() => assertSecureEnv(), /AUTH_DEBUG_RESET_TOKEN/);
    process.env.JWT_SECRET = previous;
    process.env.NODE_ENV = previousNodeEnv;
    process.env.CLIENT_URL = previousClient;
    if (previousDebug === undefined) delete process.env.AUTH_DEBUG_RESET_TOKEN;
    else process.env.AUTH_DEBUG_RESET_TOKEN = previousDebug;
    if (previousMongo === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousMongo;
  });
});

describe('login lockout email normalization', () => {
  test('email casing does not bypass lockout key', () => {
    const {
      checkLoginAllowed,
      recordFailedLogin,
      clearLoginAttempts,
    } = require('../src/utils/loginRateLimit');

    const ip = '203.0.113.50';
    clearLoginAttempts('AuditUser@Example.com', ip);
    for (let i = 0; i < 5; i += 1) {
      recordFailedLogin('AuditUser@Example.com', ip);
    }
    const blocked = checkLoginAllowed('auditusER@example.com', ip);
    assert.equal(blocked.allowed, false);
    clearLoginAttempts('auditusER@example.com', ip);
  });
});

describe('User schema password field', () => {
  test('originalPassword is not defined on the schema', () => {
    const User = require('../src/models/User');
    assert.equal(User.schema.path('originalPassword'), undefined);
    assert.ok(User.schema.path('password'));
  });
});
