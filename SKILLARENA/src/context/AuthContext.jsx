import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, clearAuth, getStoredUser, setAuth, setCsrfToken } from '../services/api'

const AuthContext = createContext(null)
const AUTH_BROADCAST = 'skillarena-auth'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    // Drop legacy JWT localStorage immediately.
    localStorage.removeItem('skillarena_token')

    const bootstrap = async () => {
      const storedUser = getStoredUser()
      if (storedUser) {
        setUser(storedUser)
      }

      try {
        const data = await authApi.me()
        if (data.csrfToken) setCsrfToken(data.csrfToken)
        setAuth(null, data.user)
        setUser(data.user)
      } catch (err) {
        if (err?.status === 401) {
          try {
            const refreshed = await authApi.refresh()
            if (refreshed?.user) {
              setAuth(null, refreshed.user)
              setUser(refreshed.user)
              return
            }
          } catch {
            clearAuth()
            setUser(null)
          }
        }
      } finally {
        setBootstrapping(false)
      }
    }

    bootstrap()
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const channel = new BroadcastChannel(AUTH_BROADCAST)
    channel.onmessage = (event) => {
      if (event.data?.type === 'logout') {
        clearAuth()
        setUser(null)
      }
      if (event.data?.type === 'login' && event.data.user) {
        setAuth(null, event.data.user)
        setUser(event.data.user)
        if (event.data.csrfToken) setCsrfToken(event.data.csrfToken)
      }
    }
    return () => channel.close()
  }, [])

  const broadcast = (message) => {
    try {
      if (typeof BroadcastChannel === 'undefined') return
      const channel = new BroadcastChannel(AUTH_BROADCAST)
      channel.postMessage(message)
      channel.close()
    } catch {
      // ignore
    }
  }

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      // Web uses HttpOnly cookies only — never persist access/refresh even if present.
      if (data.csrfToken) setCsrfToken(data.csrfToken)
      setAuth(null, data.user)
      setUser(data.user)
      broadcast({ type: 'login', user: data.user, csrfToken: data.csrfToken })
      return data.user
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name, email, password, confirmPassword) => {
    setLoading(true)
    try {
      const data = await authApi.signup({ name, email, password, confirmPassword })
      return data
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // still clear local state
    }
    clearAuth()
    setUser(null)
    broadcast({ type: 'logout' })
  }

  const updateUser = useCallback((nextUser) => {
    if (!nextUser) return
    setAuth(null, nextUser)
    setUser(nextUser)
  }, [])

  const refreshUser = useCallback(async () => {
    const data = await authApi.me()
    if (data.csrfToken) setCsrfToken(data.csrfToken)
    setAuth(null, data.user)
    setUser(data.user)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      bootstrapping,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, loading, bootstrapping, refreshUser, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
