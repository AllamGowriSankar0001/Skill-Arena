# Auth storage

## Web (browser)
- HttpOnly cookies: `sa_access`, `sa_refresh`, `sa_csrf`
- Login/refresh JSON for **browser** clients (`Origin` allowlist or `Sec-Fetch-*`): `{ message, user, csrfToken }` only — **no** `accessToken` / `refreshToken` in the body
- Minimal user snapshot only in `skillarena_user` (no tokens)
- CSRF token may live in memory + `sessionStorage` (`skillarena_csrf`) — not an auth credential
- Legacy `skillarena_token` must not be written

## Mobile (React Native / Expo)
- Detected as native when request lacks browser `Origin`/`Sec-Fetch-*`
- Login/refresh JSON includes `accessToken`, `refreshToken`, `expiresIn`, `user`, `csrfToken`
- Access + refresh in **Expo SecureStore** (iOS Keychain / Android Keystore)
  - keys: `skillarena_access_token`, `skillarena_refresh_token`
  - fail closed if SecureStore unavailable (no AsyncStorage fallback)
- Minimal user snapshot in AsyncStorage `@skillarena/user` (id, name, email, role only)
- Legacy AsyncStorage `@skillarena/token` deleted on startup
- API uses `Authorization: Bearer <accessToken>`
- Refresh: `POST /auth/refresh` with `{ refreshToken }`; single-flight; rotates refresh
- Logout: `POST /auth/logout` then wipe SecureStore

## CSRF
- Cookie-authenticated browser mutations: CSRF cookie + header, or allowlisted Origin
- Bearer requests (mobile) are exempt from CSRF

## Removed
- `X-Client-Type: mobile` branching
- Long-lived localStorage / AsyncStorage JWTs
