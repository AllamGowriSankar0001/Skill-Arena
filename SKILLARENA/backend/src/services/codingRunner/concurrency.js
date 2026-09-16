/**
 * Process-local concurrency gate for coding executions.
 * Not distributed — each API instance has its own limit.
 */
const MAX_CONCURRENT = Math.max(1, Number(process.env.CODING_MAX_CONCURRENT) || 2);

let active = 0;
const waiters = [];

const acquire = () =>
  new Promise((resolve) => {
    if (active < MAX_CONCURRENT) {
      active += 1;
      resolve();
      return;
    }
    waiters.push(resolve);
  });

const release = () => {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) {
    active += 1;
    next();
  }
};

const withCodingSlot = async (fn) => {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
};

const getCodingConcurrencyStats = () => ({
  active,
  waiting: waiters.length,
  max: MAX_CONCURRENT,
});

module.exports = {
  withCodingSlot,
  getCodingConcurrencyStats,
  MAX_CONCURRENT,
};
