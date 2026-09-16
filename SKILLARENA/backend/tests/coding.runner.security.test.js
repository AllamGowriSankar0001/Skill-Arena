/**
 * Phase 6B coding runner attack-oriented tests.
 * Runs against the isolated process worker — not the API HTTP surface.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  runCodingTests,
  getActiveCodingChildCount,
} = require('../src/services/codingTestRunner');

const { MAX_CONSOLE_CHARS } = require('../src/services/codingRunner/evaluateCore');

describe('coding runner isolation (phase 6B)', () => {
  test('infinite loop times out without hanging the API process', async () => {
    const started = Date.now();
    const result = await runCodingTests(
      { html: '', css: '', javascript: 'while (true) {}' },
      [{ type: 'CONSOLE_CONTAINS', expected: 'never' }],
    );
    const elapsed = Date.now() - started;
    assert.ok(result.jsError, 'expected jsError/timeout');
    assert.match(String(result.jsError), /timed out|Script execution timed out|Execution timed out/i);
    assert.ok(elapsed < 15_000, `elapsed ${elapsed}ms should be bounded`);
    assert.equal(getActiveCodingChildCount(), 0);
  });

  test('huge console output is truncated', async () => {
    const result = await runCodingTests(
      {
        html: '',
        css: '',
        javascript: `
          for (let i = 0; i < 5000; i++) {
            console.log('LINE-' + i + '-' + 'x'.repeat(200));
          }
        `,
      },
      [],
    );
    assert.ok(Array.isArray(result.consoleLogs));
    assert.ok(result.consoleLogs.length <= 200);
    const joined = result.consoleLogs.join('\n');
    assert.ok(joined.length <= MAX_CONSOLE_CHARS);
    assert.equal(getActiveCodingChildCount(), 0);
  });

  test('child_process require is unavailable in sandbox', async () => {
    const result = await runCodingTests(
      {
        html: '',
        css: '',
        javascript: `
          try {
            const cp = require('child_process');
            console.log('GOT_CP');
          } catch (e) {
            console.log('NO_REQUIRE');
          }
        `,
      },
      [{ type: 'CONSOLE_CONTAINS', expected: 'NO_REQUIRE' }],
    );
    assert.equal(result.passedCount, 1);
    assert.ok(!result.consoleLogs.some((line) => line.includes('GOT_CP')));
  });

  test('filesystem read of /etc/passwd is not available via require fs', async () => {
    const result = await runCodingTests(
      {
        html: '',
        css: '',
        javascript: `
          try {
            const fs = require('fs');
            const data = fs.readFileSync('/etc/passwd', 'utf8');
            console.log('GOT_PASSWD:' + String(data).slice(0, 20));
          } catch (e) {
            console.log('NO_FS');
          }
        `,
      },
      [{ type: 'CONSOLE_CONTAINS', expected: 'NO_FS' }],
    );
    assert.equal(result.passedCount, 1);
    assert.ok(!result.consoleLogs.some((line) => line.includes('GOT_PASSWD')));
  });

  test('application secrets are not present in worker-visible process.env via sandbox', async () => {
    // Parent process may have secrets; worker env must not expose them to user code.
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase6b-parent-secret-should-not-leak!!';
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://secret-host/db';

    const result = await runCodingTests(
      {
        html: '',
        css: '',
        javascript: `
          try {
            const secret = process.env && (process.env.JWT_SECRET || process.env.MONGODB_URI);
            if (secret) console.log('LEAKED');
            else console.log('NO_SECRET');
          } catch (e) {
            console.log('NO_PROCESS_ENV');
          }
        `,
      },
      [
        {
          type: 'CONSOLE_CONTAINS',
          expected: 'NO_',
        },
      ],
    );
    assert.ok(
      result.consoleLogs.some(
        (line) => line.includes('NO_SECRET') || line.includes('NO_PROCESS_ENV'),
      ),
    );
    assert.ok(!result.consoleLogs.some((line) => line.includes('LEAKED')));
  });

  test('large allocation is contained (worker may OOM or error safely)', async () => {
    const started = Date.now();
    const result = await runCodingTests(
      {
        html: '',
        css: '',
        javascript: `
          const chunks = [];
          try {
            for (let i = 0; i < 200; i++) {
              chunks.push(new Array(1e6).fill('x'));
            }
            console.log('ALLOC_OK');
          } catch (e) {
            console.log('ALLOC_FAIL');
          }
        `,
      },
      [],
    );
    const elapsed = Date.now() - started;
    assert.ok(result);
    assert.ok(elapsed < 20_000, `elapsed ${elapsed}ms`);
    // Successful huge allocation without limit would be surprising under 64MB heap.
    const allocatedOk = result.consoleLogs?.some?.((line) => line === 'ALLOC_OK');
    if (allocatedOk) {
      // Soft observation only — still must have cleaned up children.
      assert.equal(getActiveCodingChildCount(), 0);
    } else {
      assert.equal(getActiveCodingChildCount(), 0);
    }
  });

  test('concurrent executions respect process-local slotting and clean up', async () => {
    const jobs = Array.from({ length: 5 }, (_, i) =>
      runCodingTests(
        {
          html: `<p id="n">${i}</p>`,
          css: '',
          javascript: `console.log('job-${i}')`,
        },
        [{ type: 'CONSOLE_CONTAINS', expected: `job-${i}` }],
      ),
    );
    const results = await Promise.all(jobs);
    assert.equal(results.length, 5);
    results.forEach((r, i) => {
      assert.equal(r.passedCount, 1, `job ${i}`);
    });
    assert.equal(getActiveCodingChildCount(), 0);
  });

  test('network fetch attempt does not crash the host API process', async () => {
    const result = await runCodingTests(
      {
        html: '',
        css: '',
        javascript: `
          try {
            // jsdom/window fetch may exist; any network use must stay in the worker.
            if (typeof fetch === 'function') {
              fetch('http://127.0.0.1:9').catch(() => {});
              console.log('FETCH_CALLED');
            } else {
              console.log('NO_FETCH');
            }
          } catch (e) {
            console.log('FETCH_ERROR');
          }
        `,
      },
      [],
    );
    assert.ok(result);
    assert.equal(getActiveCodingChildCount(), 0);
  });
});
