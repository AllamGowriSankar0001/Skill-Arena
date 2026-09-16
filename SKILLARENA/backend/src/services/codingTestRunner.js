/**
 * Coding test runner facade.
 *
 * Untrusted JavaScript is NEVER evaluated in the API process.
 * Jobs are dispatched to an isolated Node worker with:
 * - minimal environment (no app secrets)
 * - wall-clock timeout + force kill
 * - heap size cap
 * - process-local concurrency limit
 * - stdout size limit
 *
 * Node `vm` still runs inside the worker for JSDOM grading only — it is NOT
 * treated as an OS security boundary.
 */
const { executeInIsolatedProcess, getActiveCodingChildCount, WALL_TIMEOUT_MS, MAX_OLD_SPACE_MB } =
  require('./codingRunner/processExecutor');
const { withCodingSlot, getCodingConcurrencyStats, MAX_CONCURRENT } = require('./codingRunner/concurrency');

const MAX_HTML_CHARS = 100_000;
const MAX_CSS_CHARS = 100_000;
const MAX_JS_CHARS = 100_000;

function assertCodeSize({ html, css, javascript }) {
  const fields = [
    ['html', html, MAX_HTML_CHARS],
    ['css', css, MAX_CSS_CHARS],
    ['javascript', javascript, MAX_JS_CHARS],
  ];

  for (const [name, value, max] of fields) {
    if (typeof value === 'string' && value.length > max) {
      const error = new Error(
        `${name} exceeds the maximum allowed size of ${max.toLocaleString()} characters.`,
      );
      error.statusCode = 400;
      error.code = 'CODE_TOO_LARGE';
      throw error;
    }
  }
}

/**
 * @param {{ html?: string, css?: string, javascript?: string }} code
 * @param {object[]} testCases
 */
async function runCodingTests(code = {}, testCases = []) {
  assertCodeSize(code);

  return withCodingSlot(() =>
    executeInIsolatedProcess({
      code: {
        html: code.html || '',
        css: code.css || '',
        javascript: code.javascript || '',
      },
      testCases: Array.isArray(testCases) ? testCases : [],
    }),
  );
}

module.exports = {
  runCodingTests,
  assertCodeSize,
  MAX_HTML_CHARS,
  MAX_CSS_CHARS,
  MAX_JS_CHARS,
  getActiveCodingChildCount,
  getCodingConcurrencyStats,
  WALL_TIMEOUT_MS,
  MAX_OLD_SPACE_MB,
  MAX_CONCURRENT,
};
