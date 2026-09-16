import { describe, expect, it } from 'vitest'
import { sanitizeHref } from './safeUrl.js'
import { toStoredUserSnapshot } from './authStorage.js'

describe('sanitizeHref', () => {
  it('allows https http mailto and relative urls', () => {
    expect(sanitizeHref('https://example.com')).toBe('https://example.com')
    expect(sanitizeHref('http://example.com/a')).toBe('http://example.com/a')
    expect(sanitizeHref('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(sanitizeHref('/path')).toBe('/path')
    expect(sanitizeHref('#section')).toBe('#section')
  })

  it('blocks dangerous protocols', () => {
    expect(sanitizeHref('javascript:alert(1)')).toBeNull()
    expect(sanitizeHref('data:text/html,hi')).toBeNull()
    expect(sanitizeHref('vbscript:msgbox(1)')).toBeNull()
  })
})

describe('toStoredUserSnapshot', () => {
  it('stores only bootstrap identity fields', () => {
    const snapshot = toStoredUserSnapshot({
      id: '1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'STUDENT',
      avatarUrl: '',
      status: 'ACTIVE',
      resumeProfile: { phone: '999' },
      password: 'should-not-persist',
      xp: 100,
    })
    expect(snapshot).toEqual({
      id: '1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'STUDENT',
      avatarUrl: '',
      status: 'ACTIVE',
    })
    expect(snapshot.password).toBeUndefined()
    expect(snapshot.resumeProfile).toBeUndefined()
  })
})

describe('auth storage keys', () => {
  it('does not define a JWT localStorage writer API', async () => {
    const store = new Map()
    globalThis.localStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(key, String(value))
      },
      removeItem: (key) => {
        store.delete(key)
      },
    }
    globalThis.sessionStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }

    const api = await import('../services/api.js')
    expect(typeof api.setAuth).toBe('function')
    expect(typeof api.clearAuth).toBe('function')
    expect(api.getToken).toBeUndefined()
    localStorage.removeItem('skillarena_token')
    api.setAuth('should-not-persist-as-token', {
      id: '1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'STUDENT',
    })
    expect(localStorage.getItem('skillarena_token')).toBeNull()
    expect(localStorage.getItem('skillarena_user')).toBeTruthy()

    // Simulate a mistakenly token-bearing login payload — web must not persist credentials.
    const fakeLogin = {
      user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'STUDENT' },
      accessToken: 'leak-access',
      refreshToken: 'leak-refresh',
      csrfToken: 'csrf-only',
    }
    api.setCsrfToken(fakeLogin.csrfToken)
    api.setAuth(fakeLogin.accessToken, fakeLogin.user)
    expect(localStorage.getItem('skillarena_token')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    api.clearAuth()
  })
})
