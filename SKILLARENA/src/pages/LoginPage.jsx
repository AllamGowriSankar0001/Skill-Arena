import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import PasswordField from '../components/auth/PasswordField'
import { useAuth } from '../context/AuthContext'
import { getHomeRouteForUser, ROUTES } from '../routes'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, loading, isAuthenticated, bootstrapping, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const homeRoute = getHomeRouteForUser(user)

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) {
      navigate(homeRoute, { replace: true })
    }
  }, [bootstrapping, isAuthenticated, navigate, homeRoute])

  if (bootstrapping) {
    return (
      <main className="auth-page">
        <div className="app-loading" style={{ minHeight: 'auto', background: 'transparent' }}>
          Loading…
        </div>
      </main>
    )
  }

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={homeRoute} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const loggedInUser = await login(email, password)
      navigate(getHomeRouteForUser(loggedInUser))
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <AuthCard
      eyebrow="Sign in"
      title="Welcome back"
      description="Sign in with your Skill Arena account. You will be taken to the right place automatically."
      footer={
        <>
          <AuthFooterLink to={ROUTES.signup}>Create a free account</AuthFooterLink>
          <AuthFooterLink to={ROUTES.home}>Back to homepage</AuthFooterLink>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <p className="auth-error">{error}</p> : null}

        <div className="auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  )
}

export default LoginPage
