/**
 * Auth storage helpers for the web SPA.
 *
 * Credentials live in HttpOnly cookies (`sa_access` / `sa_refresh`).
 * This module only shapes a minimal non-sensitive user snapshot for localStorage.
 */

const STORED_USER_KEYS = ['id', 'name', 'email', 'role', 'avatarUrl', 'status']

/** Persist only non-sensitive bootstrap fields — never passwords, tokens-in-user, or resume PII. */
export const toStoredUserSnapshot = (user) => {
  if (!user || typeof user !== 'object') return null
  const snapshot = {}
  for (const key of STORED_USER_KEYS) {
    if (user[key] !== undefined) snapshot[key] = user[key]
  }
  return snapshot
}
