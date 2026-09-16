/**
 * Phase 9 — resilience / race / concurrency probes (local/staging only).
 *
 * Usage:
 *   node scripts/perfPhase9Race.js
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { requestJson } = require('./perfHttp');
const { requestRaw } = require('./perfHttpRaw');

const connectDB = require('../src/config/db');
const { Battle, Assessment, User } = require('../src/models');
const {
  submitBattleQuiz,
  getTimerInfo,
} = require('../src/services/battleService');
const {
  runCodingTests,
  getActiveCodingChildCount,
  MAX_CONCURRENT: CODING_MAX,
} = require('../src/services/codingTestRunner');
const { getCodingConcurrencyStats } = require('../src/services/codingRunner/concurrency');

const BASE = process.env.PERF_MEASURE_BASE || 'http://127.0.0.1:5000/api';
const PDF_BASE = process.env.PDF_SERVICE_URL || 'http://127.0.0.1:8001';
const EMAIL = process.env.PERF_EMAIL || 'phase9.perf@skillarena.local';
const PASSWORD = process.env.PERF_PASSWORD || 'Phase9Perf!Test99';

async function http(method, urlPath, { token, body, headers = {}, timeoutMs = 60000 } = {}) {
  const res = await requestJson(method, `${BASE}${urlPath}`, {
    timeoutMs,
    body,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  return {
    status: res.status,
    ms: res.ms,
    json: res.json,
    text: res.text,
    error: res.error,
    headers: {
      limit: res.headers?.['x-ratelimit-limit'] || null,
      remaining: res.headers?.['x-ratelimit-remaining'] || null,
    },
  };
}

async function login() {
  const res = await http('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  if (!res.json?.accessToken) throw new Error(`login failed ${res.status} ${res.text}`);
  return res.json;
}

function summarizeLatencies(rows) {
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const p = (pct) => ms[Math.min(ms.length - 1, Math.ceil((pct / 100) * ms.length) - 1)] ?? null;
  return {
    n: rows.length,
    avg: ms.length ? Math.round((ms.reduce((a, b) => a + b, 0) / ms.length) * 100) / 100 : null,
    p50: p(50),
    p95: p(95),
    p99: p(99),
    min: ms[0] ?? null,
    max: ms[ms.length - 1] ?? null,
    statuses: rows.reduce((acc, r) => {
      const k = String(r.status ?? r.error ?? 'ERR');
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
  };
}

async function testRefreshContention() {
  const session = await login();
  const refreshToken = session.refreshToken;
  // Fire 8 concurrent refreshes with the SAME refresh token
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      http('POST', '/auth/refresh', { body: { refreshToken } }),
    ),
  );
  const ok = results.filter((r) => r.status === 200);
  const fail = results.filter((r) => r.status !== 200);
  // Follow-up: one of the winners should still be able to refresh; losers' tokens must not work
  let followUp = null;
  if (ok[0]?.json?.refreshToken) {
    followUp = await http('POST', '/auth/refresh', {
      body: { refreshToken: ok[0].json.refreshToken },
    });
  }
  // Reuse of the original token again should fail (reuse detection)
  const reuse = await http('POST', '/auth/refresh', { body: { refreshToken } });

  return {
    concurrentSameToken: {
      total: results.length,
      success200: ok.length,
      failures: fail.map((f) => ({ status: f.status, message: f.json?.message || f.text || f.error })),
      expected: 'Exactly one success preferred; extras should fail safely without revoking the winner incorrectly',
      observedExactlyOneSuccess: ok.length === 1,
    },
    winnerFollowUpRefresh: followUp
      ? { status: followUp.status, ok: followUp.status === 200 }
      : { status: null, ok: false },
    originalTokenReuseAfter: { status: reuse.status, message: reuse.json?.message || reuse.text },
  };
}

async function testManyUsersRefresh(seedSession) {
  // Prefer rotating an existing chain + a few fresh sessions without burning login quota.
  // Create additional sessions via repeated login only if under limit; otherwise use seed only.
  const sessions = [seedSession];
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const row = await http('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } });
    if (row.status === 429) {
      break;
    }
    if (row.json?.refreshToken) sessions.push(row.json);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 80));
  }
  const started = Date.now();
  const results = await Promise.all(
    sessions.map((s) => http('POST', '/auth/refresh', { body: { refreshToken: s.refreshToken } })),
  );
  return {
    sessions: sessions.length,
    wallMs: Date.now() - started,
    ...summarizeLatencies(results),
    allOk: results.every((r) => r.status === 200),
  };
}

async function testBattleTimerRace() {
  await connectDB();
  const user = await User.findOne({ email: EMAIL });
  if (!user) throw new Error('perf user missing');

  const other = await User.findOne({
    _id: { $ne: user._id },
    status: 'ACTIVE',
    role: { $ne: 'ADMIN' },
  }).select('_id');
  if (!other) throw new Error('Need a second ACTIVE user for battle fixture');

  // Use an existing QUIZ battle assessment — do NOT mutate shared durationSeconds.
  const assessment = await Assessment.findOne({
    type: 'BATTLE',
    mode: 'QUIZ',
    status: 'PUBLISHED',
    durationSeconds: { $gte: 30 },
  }).lean();
  if (!assessment) {
    return { skipped: true, reason: 'No QUIZ BATTLE assessment found' };
  }

  const durationSeconds = assessment.durationSeconds;
  const battleCode = `P9${Date.now().toString(36).slice(-4)}`.toUpperCase();

  // Phase A: still inside window (~10s remaining)
  const battle = await Battle.create({
    battleCode,
    format: 'ONE_V_ONE',
    mode: 'QUIZ',
    matchType: 'PRIVATE',
    skillId: assessment.skillId,
    difficulty: 'MIXED',
    assessmentId: assessment._id,
    createdBy: user._id,
    maximumPlayers: 2,
    status: 'IN_PROGRESS',
    startedAt: new Date(Date.now() - (durationSeconds - 10) * 1000),
    participants: [
      {
        userId: user._id,
        team: 'A',
        status: 'PLAYING',
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        joinedAt: new Date(),
      },
      {
        userId: other._id,
        team: 'B',
        status: 'PLAYING',
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        joinedAt: new Date(),
      },
    ],
  });

  const timerBefore = getTimerInfo({ startedAt: battle.startedAt }, { durationSeconds });
  let beforeExpiry = null;
  try {
    await submitBattleQuiz(battle._id, user._id, {});
    beforeExpiry = { accepted: true, timerExpired: timerBefore.expired };
  } catch (error) {
    beforeExpiry = {
      accepted: false,
      message: error.message,
      timerExpired: timerBefore.expired,
    };
  }

  // Phase B: force past expiry, clear completion so late submits can race
  await Battle.updateOne(
    { _id: battle._id },
    {
      $set: {
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - (durationSeconds + 5) * 1000),
        endedAt: null,
        'participants.0.completedAt': null,
        'participants.0.status': 'PLAYING',
        'participants.0.score': 0,
        'participants.0.correctAnswers': 0,
        'participants.0.wrongAnswers': 0,
        'participants.0.assessmentAttemptId': null,
      },
      $unset: { winnerType: 1, winnerUserId: 1, winnerTeam: 1 },
    },
  );

  const timerAfter = getTimerInfo(
    { startedAt: new Date(Date.now() - (durationSeconds + 5) * 1000) },
    { durationSeconds },
  );

  const lateResults = await Promise.all(
    Array.from({ length: 12 }, () =>
      submitBattleQuiz(battle._id, user._id, {})
        .then(() => ({ ok: true }))
        .catch((error) => ({ ok: false, message: error.message })),
    ),
  );

  const acceptedLate = lateResults.filter((r) => r.ok);
  const blockedLate = lateResults.filter((r) => !r.ok && /time is up/i.test(r.message || ''));
  const otherLate = lateResults.filter((r) => !r.ok && !/time is up/i.test(r.message || ''));

  const finalBattle = await Battle.findById(battle._id).lean();
  const participant = finalBattle.participants.find(
    (p) => p.userId.toString() === user._id.toString(),
  );

  await Battle.deleteOne({ _id: battle._id });

  return {
    assessmentId: assessment._id.toString(),
    durationSeconds,
    timerBefore,
    timerAfter,
    beforeExpiry,
    concurrentLate: {
      total: lateResults.length,
      accepted: acceptedLate.length,
      blockedTimeUp: blockedLate.length,
      otherErrors: otherLate.map((r) => r.message),
    },
    lateSubmitBlocked: acceptedLate.length === 0,
    concurrentLateSubmitBlocked: acceptedLate.length === 0,
    duplicateScoring: acceptedLate.length > 1,
    finalizeConsistency: !acceptedLate.length,
    finalStatus: finalBattle.status,
    participantCompletedAt: participant?.completedAt || null,
    participantScore: participant?.score,
  };
}

async function testCodingConcurrency() {
  const sleepCode = {
    html: '',
    css: '',
    javascript: 'const end = Date.now() + 800; while (Date.now() < end) {} console.log("done");',
  };
  const tests = [{ type: 'CONSOLE_CONTAINS', expected: 'done' }];

  const runWave = async (n) => {
    const peaks = [];
    const interval = setInterval(() => {
      peaks.push({ ...getCodingConcurrencyStats(), children: getActiveCodingChildCount() });
    }, 50);
    const started = Date.now();
    const results = await Promise.all(
      Array.from({ length: n }, () =>
        runCodingTests(sleepCode, tests)
          .then((r) => ({ ok: true, passed: r.passedCount }))
          .catch((e) => ({ ok: false, message: e.message })),
      ),
    );
    clearInterval(interval);
    const maxActive = peaks.reduce((m, p) => Math.max(m, p.active || 0), 0);
    const maxChildren = peaks.reduce((m, p) => Math.max(m, p.children || 0), 0);
    const maxWaiting = peaks.reduce((m, p) => Math.max(m, p.waiting || 0), 0);
    return {
      n,
      wallMs: Date.now() - started,
      ok: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
      maxActiveObserved: maxActive,
      maxChildrenObserved: maxChildren,
      maxWaitingObserved: maxWaiting,
      residualChildren: getActiveCodingChildCount(),
      residualStats: getCodingConcurrencyStats(),
    };
  };

  const waves = {};
  for (const n of [1, 2, 5, 10]) {
    // eslint-disable-next-line no-await-in-loop
    waves[`concurrent_${n}`] = await runWave(n);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    configuredMax: CODING_MAX,
    waves,
    concurrencyCapHonored: Object.values(waves).every(
      (w) => w.maxActiveObserved <= CODING_MAX && w.maxChildrenObserved <= CODING_MAX,
    ),
  };
}

async function testPdfConcurrency() {
  const atsMiss = {
    name: `Phase9 Load ${Date.now()}`,
    role: 'Engineer',
    summary: 'Concurrent PDF generation probe for Phase 9.',
    skills: ['Node', 'MongoDB'],
    experiences: [],
    projects: [],
    educations: [],
  };
  const atsHit = {
    name: 'Phase9 Cache Hit',
    role: 'Engineer',
    summary: 'Stable payload for cache hit measurements.',
    skills: ['Node'],
    experiences: [],
    projects: [],
    educations: [],
  };

  const render = async (ats) => {
    const res = await requestRaw('POST', `${PDF_BASE}/render`, {
      body: { ats },
      timeoutMs: 120000,
    });
    return {
      status: res.status,
      ms: res.ms,
      bytes: res.bytes || 0,
      cache: res.cache,
      error: res.error,
      json: res.json,
    };
  };

  // Warm cache hit target
  const warm = await render(atsHit);
  const hitSamples = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    hitSamples.push(await render(atsHit));
  }

  const runWave = async (n, unique) => {
    const started = Date.now();
    const results = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        render(
          unique
            ? { ...atsMiss, name: `${atsMiss.name}-${i}-${Date.now()}` }
            : atsHit,
        ),
      ),
    );
    return {
      n,
      wallMs: Date.now() - started,
      ...summarizeLatencies(results),
      bytesMax: Math.max(...results.map((r) => r.bytes || 0)),
      over5MiB: results.some((r) => (r.bytes || 0) > 5 * 1024 * 1024),
    };
  };

  return {
    configuredMax: Number(process.env.PDF_SERVICE_MAX_CONCURRENT || 2),
    warm,
    cacheHit: summarizeLatencies(hitSamples),
    waves: {
      miss_1: await runWave(1, true),
      miss_2: await runWave(2, true),
      miss_5: await runWave(5, true),
      hit_5: await runWave(5, false),
      miss_10: await runWave(10, true),
    },
  };
}

async function testRateLimits(seedSession) {
  // Login IP limit already exercised by load suite — probe remaining headers with refresh/forgot only.
  const loginBurst = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    loginBurst.push(
      // eslint-disable-next-line no-await-in-loop
      await http('POST', '/auth/login', { body: { email: EMAIL, password: PASSWORD } }),
    );
  }

  let refresh = seedSession.refreshToken;
  // Re-login if seed was consumed by contention test
  if (!refresh) {
    const s = await login();
    refresh = s.refreshToken;
  }
  const refreshBurst = [];
  for (let i = 0; i < 15; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const row = await http('POST', '/auth/refresh', { body: { refreshToken: refresh } });
    refreshBurst.push(row);
    if (row.json?.refreshToken) refresh = row.json.refreshToken;
  }

  const forgotBurst = [];
  for (let i = 0; i < 7; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    forgotBurst.push(
      // eslint-disable-next-line no-await-in-loop
      await http('POST', '/auth/forgot-password', {
        body: { email: EMAIL },
      }),
    );
  }

  return {
    login: {
      configured: '30/15min/IP',
      burst: summarizeLatencies(loginBurst),
      observed429: loginBurst.filter((r) => r.status === 429).length,
      lastHeaders: loginBurst[loginBurst.length - 1]?.headers,
      note: 'Full exhaustion also observed after Phase 9 load baseline logins',
    },
    refresh: {
      configured: '60/15min/IP',
      burst: summarizeLatencies(refreshBurst),
      observed429: refreshBurst.filter((r) => r.status === 429).length,
    },
    forgotPassword: {
      configured: '5/hour/IP',
      burst: summarizeLatencies(forgotBurst),
      observed429: forgotBurst.filter((r) => r.status === 429).length,
      accepted: forgotBurst.filter((r) => r.status < 400).length,
    },
  };
}

async function testMultiProcessRateLimitNote() {
  // Architectural verification without requiring two long-lived servers:
  // rateLimitMiddleware uses process-local Map — document + prove independence via
  // spawning a tiny express twin is heavy; instead read the middleware source marker.
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'middleware', 'rateLimitMiddleware.js'),
    'utf8',
  );
  return {
    processLocalMap: src.includes('const buckets = new Map()'),
    note: 'Per-process only — two API instances each keep independent counters',
    multiInstanceShared: false,
  };
}

async function testFailurePdfDown() {
  const started = Date.now();
  let result;
  try {
    await requestRaw('GET', 'http://127.0.0.1:18001/health', { timeoutMs: 2000 });
    result = { unexpected: true, ms: Date.now() - started };
  } catch (error) {
    result = { error: error.message, ms: Date.now() - started };
  }
  // requestRaw resolves errors instead of throw — check status
  const probe = await requestRaw('GET', 'http://127.0.0.1:18001/health', { timeoutMs: 2000 });
  result = {
    status: probe.status,
    error: probe.error || null,
    ms: probe.ms,
  };
  const health = await http('GET', '/health');
  return {
    pdfUnavailableProbe: result,
    apiStillHealthy: health.status === 200,
  };
}

async function testMongoRecoverySoft() {
  // Soft: verify health works; do not stop Atlas. Document as UNVERIFIED for hard kill.
  const health = await http('GET', '/health');
  return {
    hardMongoKill: 'UNVERIFIED (Atlas shared — not stopped during Phase 9)',
    apiHealth: health.status,
  };
}

async function main() {
  const report = {
    phase: 9,
    kind: 'race-resilience',
    measuredAt: new Date().toISOString(),
    host: {
      cpus: os.cpus().length,
      ramGB: Math.round(os.totalmem() / 1e9 * 10) / 10,
      freeGB: Math.round(os.freemem() / 1e9 * 10) / 10,
      node: process.version,
    },
  };

  // Non-auth heavy probes first
  report.coding = await testCodingConcurrency();
  try {
    report.pdf = await testPdfConcurrency();
  } catch (error) {
    report.pdf = { error: error.message };
  }
  try {
    report.battleRace = await testBattleTimerRace();
  } catch (error) {
    report.battleRace = { error: error.message, stack: error.stack };
  }
  report.failure = {
    pdf: await testFailurePdfDown(),
    mongo: await testMongoRecoverySoft(),
  };
  report.rateLimitArchitecture = await testMultiProcessRateLimitNote();

  // Auth probes (consume login quota carefully)
  report.refreshContention = await testRefreshContention();
  let session = await login();
  report.manyRefresh = await testManyUsersRefresh(session);
  session = await login();
  report.rateLimits = await testRateLimits(session);

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
