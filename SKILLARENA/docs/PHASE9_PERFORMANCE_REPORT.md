# Phase 9 — Production Performance, Load & Resilience Report

Measured **2026-09-06** against local API + PDF + MongoDB Atlas (shared).  
Raw artifacts: `docs/_phase9_load_raw.json`, `docs/_phase9_race_raw.json`.

**How tests were run**

```text
# API (single instance) + PDF on loopback
cd backend
npm run perf:phase9          # scripts/perfPhase9Load.js
npm run perf:phase9:race     # scripts/perfPhase9Race.js
npm test                     # includes performance.phase9 + updated security.phase4
```

Tooling: existing `perfMeasure`/`perfHotPath` plus new Node scripts (no new npm deps).  
HTTP client uses raw `http` (not undici `fetch`) because Node fetch sends `sec-fetch-mode` and the API then omits body tokens.

---

## 1. Environment

```text
CPU: 8 logical cores
RAM: ~7.8 GB (≈0.8–1.0 GB free during runs — host memory-constrained)
OS: Windows 10 (build 26200)
Node: v20.19.0
npm: 10.8.2
MongoDB: Atlas 8.0.32 (shared cluster URI from backend .env)
Backend instances: 1 (process-local rate limits + in-process battle scheduler)
PDF service: python main.py on 127.0.0.1:8001 (tectonic)
Coding runner: process-isolated workers, CODING_MAX_CONCURRENT=2 (default)
Redis / shared rate-limit store: NONE
Frontend build mode: not required for API benches (Vite had unrelated LandingPage duplicate-export parse error)
```

**Architecture assumption for limited production:** single backend instance. Multiple instances are **not** validated; rate limits and battle scheduler would be independent per process.

---

## 2. Baseline Performance

Sequential, N=30 per read endpoint (auth N≈20–25). Local API → Atlas.

| Endpoint | Requests | Avg | p50 | p95 | p99 | Errors |
| -------- | -------: | --: | --: | --: | --: | -----: |
| GET /health | 30 | 1.8 | 1.7 | 2.5 | 2.6 | 0% |
| POST /auth/login | 25 | 499 | 503 | 600 | 735 | 0% |
| POST /auth/refresh | 20 | 473 | 480 | 600 | 602 | 0% |
| GET /home | 30 | 642 | 631 | 731 | 747 | 0% |
| GET /learning/practice?limit=50 | 30 | 368 | 369 | 503 | 515 | 0% |
| GET /learning/community/meta | 30 | 277 | 261 | 382 | 386 | 0% |
| GET /learning/leaderboard?scope=global | 30 | 380 | 388 | 519 | 532 | 0% |
| GET /platform/courses/:id | 30 | 389 | 391 | 484 | 590 | 0% |
| GET /learning/leaderboard?scope=course | 30 | 574 | 481 | 998 | 2820 | 0% |

Phase 3 comparison: prior `docs/PERFORMANCE_BASELINE.md` was **code-inspection** estimates, not live HTTP — not numerically comparable. Live baseline above is the Phase 9 reference.

---

## 3. Concurrent Load Results

Mixed authenticated read workload (home, practice, community-meta, leaderboards, course-detail).

| Workload | Concurrency | Throughput | p95 | p99 | App error rate |
| -------- | ----------: | ---------: | --: | --: | -------------: |
| Profile A | 5 | 2.0 rps | 9550 ms | 9608 ms | 0% |
| Profile B | 15 | 8.5 rps | 5072 ms | 6897 ms | 0% |
| Profile C | 25 | 13.5 rps | 2894 ms | 3904 ms | 0% |

Notes:

- Zero 5xx under these profiles.
- Latency is dominated by **Atlas round-trips + host RAM pressure**, not local Express CPU alone.
- Profile A showed high tail latency (queueing / cold overlap); Profile C sustained higher RPS with still-elevated but more stable tails.
- Intentional login IP rate limit (30/15min) was exhausted by the auth baseline burst — observed later as HTTP 429 (`LOGIN_IP_RATE_LIMIT`).

Read-heavy comparison table (p95 ms):

| Endpoint | Old Baseline | Current Baseline | 10–25 Concurrency | 50+ Concurrency | Error Rate |
| -------- | -----------: | ---------------: | ----------------: | --------------: | ---------: |
| home | UNVERIFIED (inspection only) | 731 | B:6510 / C:3904 | NOT RUN (host RAM) | 0% |
| practice | UNVERIFIED | 503 | B:4564 / C:2043 | NOT RUN | 0% |
| community-meta | UNVERIFIED | 382 | B:3989 / C:2146 | NOT RUN | 0% |
| leaderboard-global | UNVERIFIED | 519 | B:3573 / C:1932 | NOT RUN | 0% |
| course-detail | UNVERIFIED | 484 | B:3990 / C:2836 | NOT RUN | 0% |
| leaderboard-course | UNVERIFIED | 998 | B:4699 / C:2118 | NOT RUN | 0% |

50+ concurrency was **not** run: free RAM ≈0.8 GB; results would reflect host starvation.

---

## 4. Battle Race Test

Service-level fixture (QUIZ battle, `durationSeconds=120`), 12 concurrent late submits after expiry.

```text
Late submit blocked: YES
Concurrent late submit blocked: YES (12/12 "Time is up")
Duplicate scoring: NO
Finalize consistency: YES (no late score mutation; status remained IN_PROGRESS with no completion)
Before expiry: accepted = YES
```

Phase 8 timer fix holds under concurrent late submission.

---

## 5. Coding Runner

```text
Configured concurrency: 2
Observed concurrency: max active=2, max children=2 (waves 1/2/5/10)
Excess behavior: queue (waiters), then run — not unbounded spawn
Worker cleanup: residual children=0 after each wave
Timeout behavior: prior Phase 6B tests still cover infinite-loop kill (reconfirmed via phase9 unit gate)
Memory behavior: no worker leak observed in these waves
Failure behavior: 0 failures in 1+2+5+10 waves
```

---

## 6. PDF Service

```text
Configured concurrency: 2 (non-blocking semaphore → HTTP 429 when full)
Observed concurrency: miss_5 → 2×200 + 3×429; miss_10 → 2×200 + 8×429
Cache hit latency: ~3–18 ms (p95 ≈18 ms) after warm
Cache miss latency: ~5.4–7.5 s (tectonic) for unique payloads
Cleanup: no >5 MiB outputs; no unbounded concurrency
Timeout: UNVERIFIED hard kill
Failure behavior: unavailable port → ECONNREFUSED; API /health still OK
```

**Bug found & fixed:** `group_skills_by_category` crashed on string skills (`'Node'`), causing HTTP 500. Now accepts `str | dict`. Regression test added.

---

## 7. Rate Limits

| Endpoint | Configured | Observed | Multi-process behavior |
| -------- | ---------: | -------: | ---------------------- |
| POST /auth/login | 30 / 15 min / IP | Headers `X-RateLimit-Limit: 30`; exhaustion → 429 after load suite | Independent per process (`Map` buckets) |
| POST /auth/refresh | 60 / 15 min / IP | 15 sequential OK in probe (under limit) | Independent per process |
| POST /auth/forgot-password | 5 / hour / IP | 5 accepted, then 2×429 | Independent per process |
| Coding HTTP | 20 / min / user | UNVERIFIED HTTP burst this run (runner gate tested in-process) | Independent per process |
| PDF API export | 10 / 15 min / user | PDF service concurrency 429 verified | API limiter process-local; PDF semaphore process-local |

---

## 8. Scheduler

```text
Single instance safe: YES (in-process setInterval 2s + battleTickRunning re-entry guard)
Overlap risk: YES if multiple API processes (documented in server.js perf note)
Duplicate execution risk: YES under multi-instance — architectural single-instance requirement
```

---

## 9. Database

```text
Engine: MongoDB Atlas 8.0.32
Under load: read endpoints remained 200 OK; latency rose with concurrency (network + pool wait)
Slow query: course leaderboard showed baseline p99 spike (2820 ms) — monitor in production
Connection pool exhaustion: not observed at ≤25 concurrent clients on this host
Hard Mongo outage test: UNVERIFIED (shared Atlas not stopped)
```

---

## 10. Resource / Resilience Results

```text
CPU: coding waves exercise worker CPU; API remained responsive
RAM: host free ~0.8–1.0 GB — primary limiter for higher concurrency profiles
Event loop: no hard hang observed; coding isolation prevents sandbox loops in API process
Mongo connections: no exhaustion signal at tested load
Child processes: coding cap honored; cleaned up
File handles: UNVERIFIED (no OS fd sampling on Windows run)
Recovery: PDF down probe OK; Mongo kill UNVERIFIED; coding workers clean after load
SMTP: forgot-password returns safely without SMTP_HOST (emails skipped)
```

---

## 11. Issues Found

### Issue A — Concurrent refresh token rotation race

```text
Severity: High (auth session integrity)
Confirmed/likely: Confirmed (8/8 HTTP 200 before fix; service+HTTP 1/8 after fix)
Observed under: 8 parallel POST /auth/refresh with identical refresh token
Impact: Multiple valid rotated sessions from one token; weakens reuse detection
Minimal fix: Atomic findOneAndUpdate claim + grace-aware reuse detection in sessionService.js
Test added: security.phase4 concurrent refresh test; HTTP retest → 1×200 + 7×INVALID_REFRESH
```

### Issue B — PDF string skills crash

```text
Severity: Medium (resume PDF generation)
Confirmed/likely: Confirmed
Observed under: PDF /render with skills: ["Node", ...]
Impact: HTTP 500 on otherwise valid ATS payloads using string skills
Minimal fix: Accept str|dict in skill_categories.group_skills_by_category
Test added: SkillCategoryTests.test_string_skills_are_accepted
```

### Issue C — Process-local rate limits / scheduler

```text
Severity: Low (known architecture; not a regression)
Confirmed/likely: Confirmed by code + login 429 behavior
Observed under: single-instance local
Impact: Multi-instance deployment would multiply limits / duplicate battle ticks
Minimal fix: Deferred (Redis / leader election) — not required for single-instance limited production
Test added: N/A (documented)
```

---

## 12. Safe Operating Envelope

Based on **this** laptop + Atlas path only (not production hardware):

```text
1–5 concurrent users:
  Functionally stable (0% app errors). Tail latency can still spike on this host.

5–25 concurrent users:
  Acceptable for limited production on similar or better infra if p95 multi-second reads are tolerated.
  Prefer single API instance; watch Atlas metrics.

25–50:
  NOT VALIDATED here (host RAM). Expect further latency growth.

50+:
  NOT VALIDATED.

Auth login:
  Hard-capped at 30 attempts / 15 min / IP on one process.
```

Do **not** treat these localhost→Atlas numbers as production SLAs.

---

## 13. Production Readiness

```text
PERFORMANCE READY FOR LIMITED PRODUCTION
```

Justification:

- No application 5xx under Profiles A–C (≤25 concurrent mixed reads).
- Battle timer Phase 8 fix holds under concurrent late submits.
- Coding concurrency cap works; workers clean up.
- PDF concurrency cap works after string-skills fix; cache hits fast.
- Critical refresh race **found and fixed** with regression coverage.
- Remaining limits are architectural (single-instance rate limits/scheduler) and host/Atlas constraints — acceptable for limited single-instance production.

---

## 14. Phase 10 Recommendation

Proceed to:

> **Final Production Release Gate / Deployment Verification**

Minimum before/during Phase 10:

1. Deploy **one** API instance (or add shared rate-limit + scheduler leader election before scaling out).
2. Confirm production sizing (CPU/RAM) exceeds this constrained laptop.
3. Verify SMTP, `PDF_SERVICE_SECRET`, and private PDF networking on the target environment.
4. Smoke-test login/refresh/home/battle submit/PDF export on staging with production-like Atlas tier.
5. Keep intentional 429s out of error SLO burn rates.

---

## Hot paths exercised (actual routes)

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/forgot-password
GET  /api/health
GET  /api/home
GET  /api/learning/practice
GET  /api/learning/community/meta
GET  /api/learning/leaderboard (global + course)
GET  /api/platform/courses/:id
Battle submitBattleQuiz (service-level race)
Coding runCodingTests (process workers)
PDF POST /render
```

Assessment/practice XP double-submit races: **partially UNVERIFIED** at HTTP level this phase (battle timer + coding/PDF/auth races prioritized). Recommend inclusion in Phase 10 staging soak if time permits.
