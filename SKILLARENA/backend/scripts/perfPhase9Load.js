/**
 * Phase 9 — HTTP baseline + concurrent load measurements (local/staging only).
 *
 * Usage (PowerShell):
 *   $env:PERF_EMAIL = "phase9.perf@skillarena.local"
 *   $env:PERF_PASSWORD = "Phase9Perf!Test99"
 *   node scripts/perfPhase9Load.js
 *
 * Optional:
 *   PERF_MEASURE_BASE=http://127.0.0.1:5000/api
 *   PERF_BASELINE_N=40
 *   PERF_SKIP_HEAVY=1
 */
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { requestJson } = require('./perfHttp');

const BASE = process.env.PERF_MEASURE_BASE || 'http://127.0.0.1:5000/api';
const EMAIL = process.env.PERF_EMAIL || 'phase9.perf@skillarena.local';
const PASSWORD = process.env.PERF_PASSWORD || 'Phase9Perf!Test99';
const BASELINE_N = Math.max(20, Math.min(100, Number(process.env.PERF_BASELINE_N) || 40));
const SKIP_HEAVY = process.env.PERF_SKIP_HEAVY === '1';

const percentile = (sorted, p) => {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const summarize = (samples) => {
  const ok = samples.filter((s) => s.ok);
  const durations = ok.map((s) => s.ms).sort((a, b) => a - b);
  const status = {};
  for (const s of samples) {
    const key = String(s.status ?? 'ERR');
    status[key] = (status[key] || 0) + 1;
  }
  const sum = durations.reduce((a, b) => a + b, 0);
  const appErrors = samples.filter((s) => s.status >= 500 || s.error).length;
  const rateLimited = samples.filter((s) => s.status === 429).length;
  return {
    requests: samples.length,
    ok: ok.length,
    avg: durations.length ? Math.round((sum / durations.length) * 100) / 100 : null,
    p50: percentile(durations, 50),
    p75: percentile(durations, 75),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    min: durations[0] ?? null,
    max: durations[durations.length - 1] ?? null,
    errorRateApp: samples.length ? Math.round((appErrors / samples.length) * 10000) / 100 : null,
    rateLimited,
    status,
  };
};

async function request(method, pathSuffix, { token, body, headers = {}, timeoutMs = 30000 } = {}) {
  return requestJson(method, `${BASE}${pathSuffix}`, {
    timeoutMs,
    body,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

async function login() {
  const res = await request('POST', '/auth/login', {
    body: { email: EMAIL, password: PASSWORD },
  });
  if (!res.json?.accessToken) {
    throw new Error(`Login failed: ${res.status} ${res.text || res.error}`);
  }
  return {
    accessToken: res.json.accessToken,
    refreshToken: res.json.refreshToken,
    loginMs: res.ms,
  };
}

async function sequentialBaseline(token, endpoints) {
  const out = {};
  for (const ep of endpoints) {
    const samples = [];
    for (let i = 0; i < BASELINE_N; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const row = await request(ep.method || 'GET', ep.path, {
        token: ep.auth === false ? undefined : token,
        body: ep.body,
      });
      samples.push(row);
      // light pacing to avoid hammering Atlas from one client
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 15));
    }
    out[ep.label] = { path: ep.path, ...summarize(samples) };
  }
  return out;
}

async function concurrentLoad(token, endpoints, concurrency, durationMs) {
  const endAt = Date.now() + durationMs;
  let cursor = 0;
  const samples = [];
  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() < endAt) {
      const ep = endpoints[cursor % endpoints.length];
      cursor += 1;
      // eslint-disable-next-line no-await-in-loop
      const row = await request(ep.method || 'GET', ep.path, {
        token: ep.auth === false ? undefined : token,
        body: ep.body,
      });
      samples.push({ ...row, label: ep.label });
    }
  });
  const wallStart = Date.now();
  await Promise.all(workers);
  const wallMs = Date.now() - wallStart;
  const byLabel = {};
  for (const s of samples) {
    if (!byLabel[s.label]) byLabel[s.label] = [];
    byLabel[s.label].push(s);
  }
  const summary = {};
  for (const [label, rows] of Object.entries(byLabel)) {
    summary[label] = summarize(rows);
  }
  return {
    concurrency,
    durationMs: wallMs,
    totalRequests: samples.length,
    throughputRps: Math.round((samples.length / (wallMs / 1000)) * 100) / 100,
    overall: summarize(samples),
    byEndpoint: summary,
  };
}

async function main() {
  const envInfo = {
    cpus: os.cpus().length,
    ramGB: Math.round(os.totalmem() / 1e9 * 10) / 10,
    freeGB: Math.round(os.freemem() / 1e9 * 10) / 10,
    platform: os.platform(),
    release: os.release(),
    node: process.version,
    base: BASE,
    baselineN: BASELINE_N,
  };

  const session = await login();
  let token = session.accessToken;

  let courseId = null;
  try {
    const courses = await request('GET', '/platform/courses');
    courseId = courses.json?.courses?.[0]?.id || courses.json?.courses?.[0]?._id || null;
  } catch {
    /* ignore */
  }

  const readEndpoints = [
    { label: 'health', path: '/health', auth: false },
    { label: 'home', path: '/home' },
    { label: 'practice', path: '/learning/practice?limit=50' },
    { label: 'community-meta', path: '/learning/community/meta' },
    { label: 'leaderboard-global', path: '/learning/leaderboard?scope=global&limit=25' },
  ];
  if (courseId) {
    readEndpoints.push({
      label: 'course-detail',
      path: `/platform/courses/${courseId}`,
      auth: false,
    });
    readEndpoints.push({
      label: 'leaderboard-course',
      path: `/learning/leaderboard?scope=course&courseId=${courseId}&limit=25`,
    });
  }

  // Auth endpoints measured separately with fresh logins where needed
  const authBaseline = {};
  {
    const samples = [];
    for (let i = 0; i < Math.min(25, BASELINE_N); i += 1) {
      // eslint-disable-next-line no-await-in-loop
      samples.push(
        // eslint-disable-next-line no-await-in-loop
        await request('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } }),
      );
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 40));
    }
    authBaseline.login = summarize(samples);
    // refresh last successful login tokens
    const lastOk = [...samples].reverse().find((s) => s.json?.refreshToken);
    if (lastOk?.json?.refreshToken) {
      token = lastOk.json.accessToken;
      const refreshSamples = [];
      let refresh = lastOk.json.refreshToken;
      for (let i = 0; i < Math.min(20, BASELINE_N); i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const row = await request('POST', '/auth/refresh', { body: { refreshToken: refresh } });
        refreshSamples.push(row);
        if (row.json?.refreshToken) refresh = row.json.refreshToken;
        if (row.json?.accessToken) token = row.json.accessToken;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 30));
      }
      authBaseline.refresh = summarize(refreshSamples);
    }
  }

  const baseline = await sequentialBaseline(token, readEndpoints);

  const profiles = {};
  profiles.A = await concurrentLoad(token, readEndpoints.filter((e) => e.label !== 'health'), 5, 12000);
  // refresh token mid-run in case access expired
  try {
    const s = await login();
    token = s.accessToken;
  } catch {
    /* keep */
  }
  profiles.B = await concurrentLoad(token, readEndpoints.filter((e) => e.label !== 'health'), 15, 15000);
  if (!SKIP_HEAVY && envInfo.freeGB >= 0.4) {
    try {
      const s = await login();
      token = s.accessToken;
    } catch {
      /* keep */
    }
    profiles.C = await concurrentLoad(token, readEndpoints.filter((e) => e.label !== 'health'), 25, 12000);
  } else {
    profiles.C = { skipped: true, reason: 'SKIP_HEAVY or low free RAM' };
  }

  const report = {
    phase: 9,
    measuredAt: new Date().toISOString(),
    environment: envInfo,
    authBaseline,
    baseline,
    concurrent: profiles,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
