# Dependency Security Policy

This repository triages `npm audit` findings carefully. The goal is **not** a green audit at any cost.

## When to run audits

- Before production releases
- After adding or upgrading dependencies
- During scheduled security reviews (at least monthly for active development)
- In CI when available (recommended: `npm audit --audit-level=high` per package tree)

Projects:

| Tree | Path |
|------|------|
| Frontend (Vite/React) | repository root |
| Backend (Express) | `backend/` |
| Mobile (Expo) | `mobile/` |
| PDF service | `pdf-service/` (stdlib; no npm runtime deps) |

## Triage process

For every finding, record:

1. Package + advisory ID/URL
2. Direct vs transitive; which parent introduces it
3. Production reachability (bundled/runtime vs build/dev only)
4. Patched version availability and major-version impact
5. Classification:

| Code | Meaning |
|------|---------|
| **A** | Production reachable — remediate promptly |
| **B** | Production dependency; vulnerable path not reachable in this app |
| **C** | Development / build / test only |
| **D** | False positive / not applicable |
| **E** | Cannot safely remediate yet (compatibility / platform constraint) |

## Severity thresholds

| Severity | Expectation |
|----------|-------------|
| Critical / High (A) | Fix before production deploy when a compatible patch exists |
| Moderate (A) | Fix in the current remediation window when safe |
| Low / informational | Document; batch with related upgrades |
| Any (E) | Document exception + follow-up (e.g. Expo SDK migration) |

## Upgrade rules

1. Prefer the **smallest compatible patched version**.
2. Prefer parent-package upgrades over deep overrides.
3. Use `overrides` only when:
   - the override is demonstrably compatible with the parent,
   - it is recorded in `package.json` + this policy’s changelog notes,
   - it is not used merely to silence audit noise.
4. **Never** use `npm audit fix --force` as a default action.
5. Major upgrades (React Native, Expo SDK, Express 5, Mongoose 9, pdfjs 6) require a **dedicated migration** with tests — do not mix into drive-by remediation.
6. Lockfiles (`package-lock.json`) must be committed with dependency changes.

## Exceptions

An exception may be documented when:

- No patched release exists for the supported platform line (e.g. Expo SDK N)
- Upgrade requires a major native toolchain change
- The vulnerable code is unreachable in production and risk is accepted temporarily

Each exception must list: package, advisory, classification, owner, and revisit date/condition.

## Reviewers

- Direct dependency upgrades affecting auth, parsing, DB, or PDF/coding: require code review
- Major framework upgrades: require explicit migration plan + full regression suite

## Prohibited

- Disabling security middleware to “make audits pass”
- Suppressing advisories without investigation
- Introducing unknown Git/HTTP dependencies to bypass an advisory
- Blind `--force` upgrades
