/**
 * Phase 9 — concurrency / timer regressions (service-level, no HTTP load).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  runCodingTests,
  getActiveCodingChildCount,
  MAX_CONCURRENT,
} = require('../src/services/codingTestRunner');
const { getCodingConcurrencyStats } = require('../src/services/codingRunner/concurrency');
const { getTimerInfo } = require('../src/services/battleService');

describe('coding concurrency gate (phase 9)', () => {
  test('configured max concurrent is at least 1', () => {
    assert.ok(MAX_CONCURRENT >= 1);
  });

  test('5 parallel executions never exceed configured concurrency', async () => {
    const code = {
      html: '',
      css: '',
      javascript: 'const end = Date.now() + 500; while (Date.now() < end) {} console.log("ok");',
    };
    const peaks = [];
    const interval = setInterval(() => {
      peaks.push({
        ...getCodingConcurrencyStats(),
        children: getActiveCodingChildCount(),
      });
    }, 40);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        runCodingTests(code, [{ type: 'CONSOLE_CONTAINS', expected: 'ok' }]),
      ),
    );
    clearInterval(interval);

    const maxActive = peaks.reduce((m, p) => Math.max(m, p.active || 0), 0);
    const maxChildren = peaks.reduce((m, p) => Math.max(m, p.children || 0), 0);
    assert.ok(maxActive <= MAX_CONCURRENT, `active ${maxActive} > max ${MAX_CONCURRENT}`);
    assert.ok(maxChildren <= MAX_CONCURRENT, `children ${maxChildren} > max ${MAX_CONCURRENT}`);
    assert.equal(getActiveCodingChildCount(), 0);
    assert.equal(results.length, 5);
  });
});

describe('battle timer authority (phase 9)', () => {
  test('expired timer is authoritative when remainingMs <= 0', () => {
    const startedAt = new Date(Date.now() - 5000);
    const timer = getTimerInfo({ startedAt }, { durationSeconds: 2 });
    assert.equal(timer.expired, true);
    assert.equal(timer.remainingSeconds, 0);
  });

  test('active timer is not expired with remaining time', () => {
    const startedAt = new Date(Date.now() - 1000);
    const timer = getTimerInfo({ startedAt }, { durationSeconds: 120 });
    assert.equal(timer.expired, false);
    assert.ok(timer.remainingSeconds > 0);
  });
});
