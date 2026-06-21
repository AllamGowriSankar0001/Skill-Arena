const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { emptyXpDelta, mergeXpDelta } = require('../src/services/xpService');

describe('xp delta helpers', () => {
  test('starts with zero earned and reversed amounts', () => {
    const delta = emptyXpDelta();
    assert.deepEqual(delta, { earned: 0, reversed: 0 });
  });

  test('merges earned and reversed xp amounts', () => {
    const total = emptyXpDelta();
    mergeXpDelta(total, { earned: 15, reversed: 0 });
    mergeXpDelta(total, { earned: 50, reversed: 0 });
    mergeXpDelta(total, { earned: 0, reversed: 10 });
    assert.deepEqual(total, { earned: 65, reversed: 10 });
  });
});

describe('lesson completion xp shape', () => {
  test('combines lesson and course rewards in one payload', () => {
    const lessonXp = { earned: 20, reversed: 0 };
    const courseXp = { earned: 100, reversed: 0 };
    const combined = emptyXpDelta();
    mergeXpDelta(combined, lessonXp);
    mergeXpDelta(combined, courseXp);
    assert.equal(combined.earned, 120);
    assert.equal(combined.reversed, 0);
  });
});
