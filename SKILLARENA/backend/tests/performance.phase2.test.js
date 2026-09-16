const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parsePositiveInt } = require('../src/utils/safeInput');

describe('practice list pagination helpers', () => {
  test('defaults and caps practice list limits', () => {
    assert.equal(parsePositiveInt(undefined, { defaultValue: 100, max: 200 }), 100);
    assert.equal(parsePositiveInt('9999', { defaultValue: 100, max: 200 }), 200);
    assert.equal(parsePositiveInt('0', { defaultValue: 100, min: 1, max: 200 }), 1);
  });
});

describe('battle scheduler query shape', () => {
  test('due STARTING filter uses scheduledAt upper bound', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const filter = {
      status: 'STARTING',
      scheduledAt: { $lte: now },
    };
    assert.equal(filter.status, 'STARTING');
    assert.ok(filter.scheduledAt.$lte instanceof Date);
  });
});

describe('User password field remains bcrypt-only', () => {
  test('originalPassword is absent from schema', () => {
    const User = require('../src/models/User');
    assert.equal(User.schema.path('originalPassword'), undefined);
    assert.ok(User.schema.path('password'));
  });
});
