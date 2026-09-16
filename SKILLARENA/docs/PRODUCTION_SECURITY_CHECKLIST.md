# Production Security Checklist (Phase 6A)

Use this before promoting SkillArena to production. Items are marked:

- **Verified from code** — enforced or implemented in the repository
- **Requires deployment verification** — must be confirmed in the live environment / secrets manager

---

## Environment

- [ ] **JWT_SECRET configured** (strong, ≥32 chars, not a placeholder) — *Verified from code: startup refuses weak/missing secrets in production*
- [ ] **JWT_ISSUER / JWT_AUDIENCE set intentionally** — *Verified from code: defaults exist; confirm production values match clients*
- [ ] **production CLIENT_URL / CLIENT_URLS configured** (explicit HTTPS origins, no `*`) — *Verified from code: production refuses missing/`*` allowlist*
- [ ] **production CORS verified** against real web origins — *Requires deployment verification*
- [ ] **Secure cookies enabled** (`Secure` + appropriate `SameSite`) — *Verified from code: production defaults `Secure` + `SameSite=None`; confirm HTTPS*
- [ ] **SMTP configured** (`SMTP_HOST`, credentials, `SMTP_FROM`) — *Requires deployment verification* (startup warns if missing; does not invent delivery)
- [ ] **AUTH_DEBUG_RESET_TOKEN disabled** — *Verified from code: production startup throws if set to `1`*
- [ ] **production database configured securely** (`MONGODB_URI`, network ACLs, least-privilege user) — *Verified from code: URI required; ACL/user — deployment*
- [ ] **API secrets via environment/secrets manager** (`GEMINI_API_KEY*`, `AI_KEYS_SECRET`, `PDF_SERVICE_SECRET`, admin bootstrap) — *Requires deployment verification*
- [ ] **PDF_SERVICE_URL / PDF_SERVICE_SECRET** set for the private PDF service — *Requires deployment verification*
- [ ] **PDF service bound to loopback/private network only** (not public Internet) — *Verified from code default `127.0.0.1`; deploy must not publish the port*
- [ ] **PDF_SERVICE_SECRET required** when not on loopback — *Verified from code: startup refuses otherwise*
- [ ] **Local `.env` files never committed** — *Verified from code: `.env` gitignored; still rotate if a secret was ever shared*

## Authentication

- [ ] **Web cookie login tested** (`sa_access` / `sa_refresh` HttpOnly; CSRF present) — *Requires deployment verification*
- [ ] **Mobile SecureStore login tested** (Bearer access; no AsyncStorage tokens) — *Requires deployment verification*
- [ ] **Refresh rotation tested** (A→B; reuse of A revoked) — *Verified from code/tests; re-check in staging*
- [ ] **Logout revocation tested** (server session + local clear) — *Verified from code/tests; re-check in staging*
- [ ] **Password reset tested end-to-end with real SMTP** — *Requires deployment verification*
- [ ] **Password change tested** (sessions revoked; new session issued) — *Verified from code; re-check in staging*
- [ ] **Legacy clients without cookies/SecureStore identified** — *Requires deployment verification*

## Security controls

- [ ] **HTTPS enabled** end-to-end (web + API) — *Requires deployment verification*
- [ ] **CORS verified** (allowed origin OK; unknown origin rejected; credentials only for allowlist) — *Verified from code allowlist; live probe — deployment*
- [ ] **CSRF verified** for cookie-authenticated mutations; Bearer exempt — *Verified from code/tests*
- [ ] **Rate limiting verified** (429 responses; no secret leakage) — *Verified from code: process-local only*
- [ ] **Security logging reviewed** (no tokens/passwords/cookies/Authorization) — *Verified from code*
- [ ] **No credential leakage in logs** — *Requires deployment verification* (sample production log stream)
- [ ] **Dependency audit reviewed** (`npm audit`) — *Requires deployment verification* each release

## Rate limiting note (do not claim distributed protection)

Current auth rate limits are **in-memory / per process**. With multiple API instances, each process has its own counters. Before horizontal scaling, introduce a shared store (e.g. Redis) for:

| Endpoint | Limit | Key |
|----------|-------|-----|
| `/auth/signup` | 10 / hour | IP |
| `/auth/login` | 30 / 15 min | IP |
| Login lockout | 5 failures → 15 min | email+IP (normalized) |
| `/auth/refresh` | 60 / 15 min | IP |
| `/auth/forgot-password` | 5 / hour | IP |
| `/auth/reset-password` | 10 / hour | IP |
| `/auth/change-password` | 10 / hour | IP |

## Deployment

- [ ] **Mobile production build tested** — *Requires deployment verification*
- [ ] **Web production build tested** — *Requires deployment verification*
- [ ] **SMTP email delivery tested** (forgot-password inbox) — *Requires deployment verification*
- [ ] **Password reset link uses production CLIENT_URL** — *Requires deployment verification*
- [ ] **Multi-instance / scheduler note understood** (battle tick is single-process) — *Verified from code comment*

## SMTP production configuration

SMTP production configuration must be verified during deployment.

Required env (never commit real values):

- `SMTP_HOST`
- `SMTP_PORT` (typically 587)
- `SMTP_SECURE` (as required by provider)
- `SMTP_USER` / `SMTP_PASS`
- `SMTP_FROM`

Without `SMTP_HOST`, the API still returns a generic forgot-password response and stores a hashed reset token, but **no email is sent**.
