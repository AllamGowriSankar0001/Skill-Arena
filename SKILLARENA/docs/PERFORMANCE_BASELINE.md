# Performance Baseline (Phase 2 — before changes)

Measured from **code inspection** (not live APM). Approximate query counts for typical requests.

## Backend hotspots

| Endpoint / path | Approx queries before | Issue |
|---|---|---|
| `GET /learning/practice` | **1 + N** (N = published practice assessments) | `listPracticeForUser` → `getUserAttemptSummary` per assessment; each loads **all** attempt docs |
| `GET /home` | ~10–15 | Already partly parallel; User loaded without projection; continue-learning populates full Course/Lesson |
| `GET /platform/courses/:id` | 3 | Lessons loaded **with full `content`** then discarded |
| `GET /learning/community/meta` | **7 + C + R + O** (categories + rooms + official) | Fan-out `countDocuments` per channel |
| Battle scheduler (every 2s) | 2 full finds + N start + M finalize | Scans all STARTING/IN_PROGRESS battles |
| Publish lesson | 1 + E × recalculate | Each recalculate reloads all lessons + progress |
| Course leaderboard | 2–3 + **unbounded** enrollment scan for yourRank | Missing `courseId` leading index |

## Frontend baseline (from prior `vite build`)

| Chunk | Size |
|---|---|
| `index-*.js` | ~1285 kB (~363 kB gzip) |
| `CodeEditor-*.js` | ~568 kB |
| `pdf.worker.min-*.mjs` | ~1244 kB (eager via ResumeMaker import graph) |
| Routes | All pages statically imported in `App.jsx` |

## Confirmed unused / heavy deps

- `jspdf`: only referenced inside a **comment block** in `atsResumePdf.js`; runtime uses server PDF.
- `pdfjs-dist`: eager via `ResumeMakerPage` → `extractPdfText.js`.
