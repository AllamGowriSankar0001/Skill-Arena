const { JSDOM } = require('jsdom');
const vm = require('vm');

function buildDocument(html, css, javascript) {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><style>${css || ''}</style></head><body>${html || ''}</body></html>`,
    { runScripts: 'outside-only', url: 'https://skillarena.local/' },
  );

  const consoleLogs = [];
  const window = dom.window;
  const document = window.document;

  window.console = {
    log: (...args) => consoleLogs.push(args.map(String).join(' ')),
    warn: (...args) => consoleLogs.push(`[warn] ${args.map(String).join(' ')}`),
    error: (...args) => consoleLogs.push(`[error] ${args.map(String).join(' ')}`),
  };

  const globals = {};
  try {
    if (javascript?.trim()) {
      const script = new vm.Script(javascript, { timeout: 1000 });
      const sandbox = {
        window,
        document,
        console: window.console,
        result: undefined,
      };
      script.runInNewContext(sandbox, { timeout: 1000 });
      Object.keys(sandbox).forEach((key) => {
        if (!['window', 'document', 'console'].includes(key)) {
          globals[key] = sandbox[key];
        }
      });
    }
  } catch (error) {
    return { document, window, consoleLogs, jsError: error.message, globals };
  }

  return { document, window, consoleLogs, jsError: null, globals };
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
        const propPattern = new RegExp(
          `${testCase.property}\\s*:\\s*([^;]+)`,
          'i',
        );
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

function runCodingTests({ html, css, javascript }, testCases = []) {
  const context = buildDocument(html, css, javascript);
  context.css = css;

  const results = testCases.map((testCase, index) => {
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
  runCodingTests,
};
