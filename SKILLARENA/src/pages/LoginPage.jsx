import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import AuthErrorAlert from '../components/auth/AuthErrorAlert'
import PasswordField from '../components/auth/PasswordField'
import { useAuth } from '../context/AuthContext'
import { getHomeRouteForUser, ROUTES } from '../routes'
import { validateLoginForm } from '../utils/authValidation'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, isAuthenticated, bootstrapping, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')
  const successMessage = location.state?.signupSuccess

  const homeRoute = getHomeRouteForUser(user)
  const redirectPath = location.state?.from?.pathname || homeRoute

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) {
      navigate(redirectPath, { replace: true })
    }
  }, [bootstrapping, isAuthenticated, navigate, redirectPath])

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
    return <Navigate to={redirectPath} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setErrorField('')

    const validation = validateLoginForm({ email, password })
    if (!validation.ok) {
      setError(validation.message)
      setErrorField(validation.field || '')
      return
    }

    try {
      const loggedInUser = await login(validation.email, validation.password)
      const destination = location.state?.from?.pathname || getHomeRouteForUser(loggedInUser)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
      setErrorField('')
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
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {successMessage ? (
          <p className="auth-success" role="status">
            {successMessage}
          </p>
        ) : null}
        {error ? <AuthErrorAlert message={error} field={errorField} /> : null}

        <div className={`auth-field${errorField === 'email' ? ' auth-field--error' : ''}`}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (errorField === 'email') {
                setError('')
                setErrorField('')
              }
            }}
            autoComplete="email"
            aria-invalid={errorField === 'email' || undefined}
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (errorField === 'password') {
              setError('')
              setErrorField('')
            }
          }}
          autoComplete="current-password"
          hasError={errorField === 'password'}
        />

        <div className="auth-field-row">
          <Link to={ROUTES.forgotPassword} className="auth-forgot-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  )
}

export default LoginPage
