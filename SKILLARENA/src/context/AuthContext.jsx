import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, clearAuth, getStoredUser, setAuth } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('skillarena_token')
      if (!token) {
        setUser(null)
        setBootstrapping(false)
        return
      }

      const storedUser = getStoredUser()
      if (storedUser) {
        setUser(storedUser)
      }

      try {
        const data = await authApi.me()
        setAuth(token, data.user)
        setUser(data.user)
      } catch (err) {
        if (err?.status === 401) {
          clearAuth()
          setUser(null)
        }
      } finally {
        setBootstrapping(false)
      }
    }

    bootstrap()
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      setAuth(data.token, data.user)
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name, email, password) => {
    setLoading(true)
    try {
      const data = await authApi.signup({ name, email, password })
      setAuth(data.token, data.user)
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearAuth()
    setUser(null)
  }

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('skillarena_token')
    if (!token) {
      setUser(null)
      return
    }
    const data = await authApi.me()
    setAuth(token, data.user)
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
    }),
    [user, loading, bootstrapping, refreshUser],
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
