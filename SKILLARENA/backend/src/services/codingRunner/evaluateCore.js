/**
 * Core coding evaluation used ONLY inside the isolated worker process.
 * Node `vm` is language-context isolation + timeout — NOT an OS security boundary.
 * Host protection comes from process isolation (minimal env, memory cap, kill-on-timeout).
 */
const { JSDOM } = require('jsdom');
const vm = require('vm');

const SCRIPT_TIMEOUT_MS = Number(process.env.CODING_SCRIPT_TIMEOUT_MS) || 1000;
const MAX_CONSOLE_LINES = 200;
const MAX_CONSOLE_CHARS = 32_000;

function truncateConsoleLogs(logs) {
  const limited = (logs || []).slice(0, MAX_CONSOLE_LINES);
  let total = 0;
  const out = [];
  const marker = '…[truncated]';
  for (const line of limited) {
    let text = String(line);
    const sep = out.length ? 1 : 0;
    if (total + sep + text.length > MAX_CONSOLE_CHARS) {
      const remaining = Math.max(0, MAX_CONSOLE_CHARS - total - sep);
      if (remaining > marker.length) {
        out.push(text.slice(0, remaining - marker.length) + marker);
      } else if (remaining > 0) {
        out.push(text.slice(0, remaining));
      }
      break;
    }
    out.push(text);
    total += sep + text.length;
  }
  return out;
}

function sanitizeJsError(message) {
  const text = String(message || 'Execution failed.');
  // Strip absolute Windows/Unix paths from user-facing errors.
  return text
    .replace(/[A-Za-z]:\\[^\s:]+/g, '[path]')
    .replace(/\/(?:Users|home|app|var|etc|tmp)\/[^\s:]+/g, '[path]')
    .slice(0, 500);
}

function buildDocument(html, css, javascript) {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><style>${css || ''}</style></head><body>${html || ''}</body></html>`,
    {
      runScripts: 'outside-only',
      url: 'https://skillarena.local/',
      // Do not enable resource loading — avoids worker fetching remote URLs from HTML.
    },
  );

  const consoleLogs = [];
  const window = dom.window;
  const document = window.document;

  try {
    delete window.process;
    delete window.require;
  } catch {
    /* ignore */
  }

  window.console = {
    log: (...args) => consoleLogs.push(args.map(String).join(' ')),
    warn: (...args) => consoleLogs.push(`[warn] ${args.map(String).join(' ')}`),
    error: (...args) => consoleLogs.push(`[error] ${args.map(String).join(' ')}`),
  };

  const globals = {};
  try {
    if (javascript?.trim()) {
      const script = new vm.Script(javascript, {
        timeout: SCRIPT_TIMEOUT_MS,
        filename: 'user-code.js',
      });
      const sandbox = {
        window,
        document,
        console: window.console,
        result: undefined,
      };
      script.runInNewContext(sandbox, { timeout: SCRIPT_TIMEOUT_MS });
      Object.keys(sandbox).forEach((key) => {
        if (!['window', 'document', 'console'].includes(key)) {
          globals[key] = sandbox[key];
        }
      });
    }
  } catch (error) {
    return {
      document,
      window,
      consoleLogs: truncateConsoleLogs(consoleLogs),
      jsError: sanitizeJsError(error.message),
      globals,
    };
  }

  return {
    document,
    window,
    consoleLogs: truncateConsoleLogs(consoleLogs),
    jsError: null,
    globals,
  };
}

function getStylesheetRules(css) {
  if (!css?.trim()) return [];
  const rules = [];
  const rulePattern = /([^{]+)\{([^}]*)\}/g;
  let match = rulePattern.exec(css);
  while (match) {
    rules.push({
      selector: match[1].trim(),
      body: match[2].trim(),
    });
    match = rulePattern.exec(css);
  }
  return rules;
}

function runSingleTest(testCase, context) {
  const { document, consoleLogs, globals, css } = context;
  const type = testCase.type || 'TEXT_CONTAINS';

  try {
    switch (type) {
      case 'ELEMENT_EXISTS':
        return Boolean(document.querySelector(testCase.selector));

      case 'TEXT_CONTAINS': {
        const el = document.querySelector(testCase.selector);
        if (!el) return false;
        return el.textContent.includes(String(testCase.expected));
      }

      case 'DOM_TEXT_EQUALS': {
        const el = document.querySelector(testCase.selector);
        if (!el) return false;
        return el.textContent.trim() === String(testCase.expected).trim();
      }

      case 'ATTRIBUTE_EQUALS': {
        const el = document.querySelector(testCase.selector);
        if (!el) return false;
        return el.getAttribute(testCase.attribute) === String(testCase.expected);
      }

      case 'ELEMENT_COUNT': {
        const count = document.querySelectorAll(testCase.selector).length;
        return count === Number(testCase.expected);
      }

      case 'STYLE_EQUALS':
      case 'STYLE_CONTAINS': {
        const rules = getStylesheetRules(css);
        const matchingRule = rules.find((rule) =>
          rule.selector.split(',').some((part) => part.trim() === testCase.selector),
        );
        if (!matchingRule) return false;
        const propPattern = new RegExp(`${testCase.property}\\s*:\\s*([^;]+)`, 'i');
        const propMatch = matchingRule.body.match(propPattern);
        if (!propMatch) return false;
        const value = propMatch[1].trim();
        if (type === 'STYLE_EQUALS') return value === String(testCase.expected);
        return value.includes(String(testCase.expected));
      }

      case 'CONSOLE_CONTAINS':
        return consoleLogs.some((line) => line.includes(String(testCase.expected)));

      case 'GLOBAL_VALUE_EQUALS':
        return globals[testCase.variable] === testCase.expected;

      default:
        return false;
    }
  } catch {
    return false;
  }
}

function evaluateCodingJob({ html, css, javascript }, testCases = []) {
  const context = buildDocument(html || '', css || '', javascript || '');
  context.css = css || '';

  const results = (Array.isArray(testCases) ? testCases : []).map((testCase, index) => {
    const passed = runSingleTest(testCase, context);
    return {
      index,
      type: testCase.type,
      label: testCase.label || testCase.type,
      selector: testCase.selector,
      passed,
      hidden: Boolean(testCase.hidden),
      points: testCase.points || 1,
    };
  });

  const passedCount = results.filter((result) => result.passed).length;
  const totalCount = results.length;
  const score = totalCount ? Math.round((passedCount / totalCount) * 100) : 0;

  return {
    results,
    passedCount,
    totalCount,
    score,
    jsError: context.jsError,
    consoleLogs: context.consoleLogs,
  };
}

module.exports = {
  evaluateCodingJob,
  SCRIPT_TIMEOUT_MS,
  MAX_CONSOLE_LINES,
  MAX_CONSOLE_CHARS,
};
