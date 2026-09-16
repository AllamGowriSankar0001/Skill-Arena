const { AsyncLocalStorage } = require('async_hooks');
const mongoose = require('mongoose');

const store = new AsyncLocalStorage();

let installed = false;

const getStore = () => store.getStore();

/**
 * Count Mongo operations for the active request context.
 * Uses mongoose debug hook so it works even after models are compiled.
 */
const installMongooseQueryCounter = () => {
  if (installed) return;
  installed = true;

  mongoose.set('debug', (collectionName, methodName) => {
    const current = getStore();
    if (!current) return;
    current.queryCount += 1;
    if (current.ops.length < 40) {
      current.ops.push(`${collectionName}.${methodName}`);
    }
  });
};

const runWithPerfContext = (fn) => {
  const context = { queryCount: 0, ops: [], spans: [] };
  return store.run(context, fn);
};

const getPerfContext = () => getStore();

/**
 * Record a named span (ms). No-op outside a perf context.
 * Never pass PII / tokens into `name`.
 */
const addPerfSpan = (name, durationMs) => {
  const current = getStore();
  if (!current || !Array.isArray(current.spans)) return;
  if (current.spans.length >= 40) return;
  current.spans.push({
    name: String(name).slice(0, 80),
    ms: Math.round(Number(durationMs) * 100) / 100,
  });
};

/**
 * Time an async function and record a span when a perf context is active.
 */
const withPerfSpan = async (name, fn) => {
  const started = process.hrtime.bigint();
  try {
    return await fn();
  } finally {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    addPerfSpan(name, ms);
  }
};

module.exports = {
  installMongooseQueryCounter,
  runWithPerfContext,
  getPerfContext,
  addPerfSpan,
  withPerfSpan,
};
