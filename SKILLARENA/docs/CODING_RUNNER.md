# Coding Runner Isolation (Phase 6B)

## Product split

| Concern | Where it runs |
|---------|----------------|
| Live HTML/CSS/JS **preview** | Browser sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) |
| **Grading / hidden tests** | Isolated Node **worker process** spawned by the API |

Node `vm` inside the worker is **not** an OS security boundary. Host protection comes from process isolation.

## Architecture

```text
Authenticated API request
        ↓
size checks + rate limit + concurrency slot
        ↓
spawn node --max-old-space-size=64 worker.js
  env: PATH / TEMP / SystemRoot only (no JWT/Mongo/SMTP/AI secrets)
        ↓
worker: JSDOM + vm (1s script timeout)
        ↓
JSON result on stdout (size-capped)
        ↓
wall timeout → force-kill worker (+ taskkill tree on Windows)
```

## Limits (defaults)

| Limit | Default | Env override |
|-------|---------|--------------|
| Script timeout (vm) | 1000 ms | `CODING_SCRIPT_TIMEOUT_MS` |
| Wall timeout | 3000 ms | `CODING_WALL_TIMEOUT_MS` |
| Worker heap | 64 MB | `CODING_MAX_OLD_SPACE_MB` |
| Concurrent executions / API process | 2 | `CODING_MAX_CONCURRENT` |
| stdout cap | 256 KiB | `CODING_MAX_STDOUT_BYTES` |
| HTML/CSS/JS input | 100_000 chars each | code constants |
| Console lines / chars | 200 / 32_000 | evaluateCore |
| HTTP rate limit | **20 / minute / user** | route config |

Concurrency and rate limits are **process-local**.

## Network / filesystem

Process isolation does **not** equal Docker `--network none`.

- Worker still runs on the host OS network stack unless a container runner is added.
- Production recommendation: dedicated execution service with ephemeral containers (`--network none`, `--read-only`, `--cap-drop ALL`, no Docker socket on the public API).

## Docker

This development environment did not have Docker available. Do **not** mount `/var/run/docker.sock` into the public API container.
