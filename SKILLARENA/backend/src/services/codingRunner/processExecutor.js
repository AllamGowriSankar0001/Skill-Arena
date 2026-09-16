/**
 * Spawn an isolated Node worker to evaluate untrusted coding submissions.
 * Does NOT pass application secrets. Kills the worker on timeout.
 */
const { spawn } = require('child_process');
const path = require('path');

const WORKER_PATH = path.join(__dirname, 'worker.js');
const WALL_TIMEOUT_MS = Math.max(1500, Number(process.env.CODING_WALL_TIMEOUT_MS) || 3000);
const MAX_STDOUT_BYTES = Math.max(16_384, Number(process.env.CODING_MAX_STDOUT_BYTES) || 262_144);
const MAX_OLD_SPACE_MB = Math.max(32, Number(process.env.CODING_MAX_OLD_SPACE_MB) || 64);

/** @type {Set<import('child_process').ChildProcess>} */
const activeChildren = new Set();

const minimalEnv = () => ({
  // Intentionally omit JWT_SECRET, MONGODB_URI, SMTP_*, API keys, etc.
  PATH: process.env.PATH || '',
  SystemRoot: process.env.SystemRoot || '', // Windows Node needs this
  TEMP: process.env.TEMP || process.env.TMP || '',
  TMP: process.env.TMP || process.env.TEMP || '',
  LANG: process.env.LANG || 'C',
  NODE_ENV: 'production',
  CODING_SCRIPT_TIMEOUT_MS: String(process.env.CODING_SCRIPT_TIMEOUT_MS || 1000),
});

const forceKill = (child) => {
  if (!child || child.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      /* ignore */
    }
  }
};

const executeInIsolatedProcess = (job) =>
  new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [`--max-old-space-size=${MAX_OLD_SPACE_MB}`, WORKER_PATH],
      {
        env: minimalEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        // On Unix, new process group aids tree kill via -pid.
        detached: process.platform !== 'win32',
      },
    );

    activeChildren.add(child);

    let stdout = Buffer.alloc(0);
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let truncated = false;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeChildren.delete(child);
      resolve(payload);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      forceKill(child);
    }, WALL_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      if (stdout.length + chunk.length > MAX_STDOUT_BYTES) {
        truncated = true;
        stdout = Buffer.concat([stdout, chunk.slice(0, Math.max(0, MAX_STDOUT_BYTES - stdout.length))]);
        forceKill(child);
        return;
      }
      stdout = Buffer.concat([stdout, chunk]);
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.length < 4000) {
        stderr += chunk.toString('utf8').slice(0, 4000 - stderr.length);
      }
    });

    child.on('error', () => {
      finish({
        results: [],
        passedCount: 0,
        totalCount: 0,
        score: 0,
        jsError: 'Execution failed.',
        consoleLogs: [],
        runnerCode: 'SPAWN_FAILED',
      });
    });

    child.on('close', () => {
      activeChildren.delete(child);

      if (timedOut) {
        finish({
          results: [],
          passedCount: 0,
          totalCount: 0,
          score: 0,
          jsError: 'Execution timed out.',
          consoleLogs: [],
          runnerCode: 'TIMEOUT',
        });
        return;
      }

      if (truncated) {
        finish({
          results: [],
          passedCount: 0,
          totalCount: 0,
          score: 0,
          jsError: 'Execution produced too much output.',
          consoleLogs: [],
          runnerCode: 'OUTPUT_LIMIT',
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout.toString('utf8') || '{}');
        if (parsed.ok && parsed.result) {
          finish(parsed.result);
          return;
        }
        finish({
          results: [],
          passedCount: 0,
          totalCount: 0,
          score: 0,
          jsError: parsed.message || 'Execution failed.',
          consoleLogs: [],
          runnerCode: parsed.code || 'WORKER_FAILED',
        });
      } catch {
        finish({
          results: [],
          passedCount: 0,
          totalCount: 0,
          score: 0,
          jsError: 'Execution failed.',
          consoleLogs: [],
          runnerCode: 'INVALID_WORKER_OUTPUT',
        });
      }
    });

    try {
      child.stdin.write(JSON.stringify(job));
      child.stdin.end();
    } catch {
      forceKill(child);
      finish({
        results: [],
        passedCount: 0,
        totalCount: 0,
        score: 0,
        jsError: 'Execution failed.',
        consoleLogs: [],
        runnerCode: 'STDIN_FAILED',
      });
    }
  });

const getActiveCodingChildCount = () => activeChildren.size;

// Best-effort cleanup if the API process exits.
const cleanupAll = () => {
  for (const child of activeChildren) {
    forceKill(child);
  }
  activeChildren.clear();
};

process.on('exit', cleanupAll);
process.on('SIGINT', () => {
  cleanupAll();
});
process.on('SIGTERM', () => {
  cleanupAll();
});

module.exports = {
  executeInIsolatedProcess,
  getActiveCodingChildCount,
  WALL_TIMEOUT_MS,
  MAX_STDOUT_BYTES,
  MAX_OLD_SPACE_MB,
  forceKill,
};
