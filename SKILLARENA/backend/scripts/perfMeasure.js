/**
 * Profile hot endpoints with repeated runs + capture [perf] spans from API logs when PERF_LOG=1.
 *
 * Usage (PowerShell):
 *   $env:PERF_MEASURE_TOKEN = "<jwt>"
 *   $env:PERF_MEASURE_RUNS = "5"
 *   npm run perf:measure
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE = process.env.PERF_MEASURE_BASE || 'http://127.0.0.1:5000/api';
const TOKEN = process.env.PERF_MEASURE_TOKEN || '';
const RUNS = Math.max(1, Math.min(20, Number(process.env.PERF_MEASURE_RUNS) || 5));

async function measureOnce(label, pathSuffix, { auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (auth) {
    if (!TOKEN) {
      return { label, error: 'PERF_MEASURE_TOKEN not set' };
    }
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  const started = process.hrtime.bigint();
  let response;
  try {
    response = await fetch(`${BASE}${pathSuffix}`, { headers });
  } catch (error) {
    return { label, path: pathSuffix, error: error.message };
  }
  const body = await response.text();
  const durationMs = Number(process.hrtime.bigint() - started) / 1e6;

  return {
    label,
    path: pathSuffix,
    status: response.status,
    durationMs: Math.round(durationMs * 100) / 100,
    responseBytes: Buffer.byteLength(body, 'utf8'),
  };
}

function summarize(durations) {
  if (!durations.length) return null;
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    runs: sorted.length,
    first: sorted.length ? durations[0] : null,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round((sum / sorted.length) * 100) / 100,
    all: durations,
  };
}

async function measureRepeated(label, pathSuffix, opts) {
  const results = [];
  for (let i = 0; i < RUNS; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const row = await measureOnce(label, pathSuffix, opts);
    results.push(row);
  }
  const ok = results.filter((row) => row.status && !row.error);
  const durations = ok.map((row) => row.durationMs);
  return {
    label,
    path: pathSuffix,
    status: ok[0]?.status ?? results[0]?.status ?? null,
    responseBytes: ok[0]?.responseBytes ?? null,
    error: results.find((row) => row.error)?.error || null,
    timing: summarize(durations),
  };
}

async function main() {
  const endpoints = [];

  endpoints.push(await measureRepeated('health', '/health', { auth: false }));
  endpoints.push(await measureRepeated('home', '/home'));
  endpoints.push(await measureRepeated('practice', '/learning/practice?limit=50'));
  endpoints.push(await measureRepeated('community-meta', '/learning/community/meta'));
  endpoints.push(
    await measureRepeated('leaderboard-global', '/learning/leaderboard?scope=global&limit=25'),
  );

  let courseId = null;
  try {
    const coursesRes = await fetch(`${BASE}/platform/courses`);
    const coursesJson = await coursesRes.json();
    courseId = coursesJson?.courses?.[0]?.id || coursesJson?.courses?.[0]?._id;
  } catch (error) {
    endpoints.push({ label: 'course-discovery', error: error.message });
  }

  if (courseId) {
    endpoints.push(
      await measureRepeated('course-detail', `/platform/courses/${courseId}`, { auth: false }),
    );
    endpoints.push(
      await measureRepeated(
        'leaderboard-course',
        `/learning/leaderboard?scope=course&courseId=${courseId}&limit=25`,
      ),
    );
  } else {
    endpoints.push({ label: 'course-detail', error: 'No published course found' });
  }

  console.log(JSON.stringify({ base: BASE, runsPerEndpoint: RUNS, endpoints }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
