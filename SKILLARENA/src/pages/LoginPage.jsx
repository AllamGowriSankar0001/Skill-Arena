import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import AuthErrorAlert from '../components/auth/AuthErrorAlert'
import PasswordField from '../components/auth/PasswordField'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import { useAuth } from '../context/AuthContext'
import { getHomeRouteForUser, ROUTES } from '../routes'
import {
  FIELD_LIMITS,
  getEmailError,
  isLoginFormReady,
  validateLoginForm,
} from '../utils/authValidation'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, isAuthenticated, bootstrapping, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [serverError, setServerError] = useState('')
  const successMessage = location.state?.signupSuccess

  const emailError = useMemo(() => getEmailError(email), [email])
  const formReady = useMemo(() => isLoginFormReady({ email, password }), [email, password])

  const homeRoute = getHomeRouteForUser(user)
  const redirectPath = location.state?.from?.pathname || homeRoute

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) {
      navigate(redirectPath, { replace: true })
    }
  }, [bootstrapping, isAuthenticated, navigate, redirectPath])

  if (bootstrapping) {
    return (
      <div className="app-loading-bone">
        <PageLoadingSkeleton label="Loading sign in" />
      </div>
    )
  }

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={redirectPath} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')

    const validation = validateLoginForm({ email, password })
    if (!validation.ok) {
      setServerError(validation.message)
      return
    }

    try {
      const loggedInUser = await login(validation.email, validation.password)
      const destination =
        loggedInUser?.role === 'ADMIN'
          ? getHomeRouteForUser(loggedInUser)
          : location.state?.from?.pathname || getHomeRouteForUser(loggedInUser)
      navigate(destination, { replace: true })
    } catch (err) {
      setServerError(err.message || 'Login failed')
    }
  }

  const canSubmit = formReady && !loading

  return (
    <AuthCard
      eyebrow="Sign in"
      title="Welcome back"
      description="Sign in to continue learning, practicing, and competing in Skill Arena."
      panelTitle="Your arena is waiting."
      panelDescription="Pick up courses, jump into practice, or queue a battle — all from one account."
      footer={<AuthFooterLink to={ROUTES.signup}>New here? Create a free account</AuthFooterLink>}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {successMessage ? (
          <p className="auth-success" role="status">
            {successMessage}
          </p>
        ) : null}
        {serverError ? <AuthErrorAlert message={serverError} /> : null}

        <div className={`auth-field${emailError ? ' auth-field--error' : ''}`}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (serverError) setServerError('')
            }}
            autoComplete="email"
            maxLength={FIELD_LIMITS.email}
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={emailError ? 'login-email-error' : undefined}
          />
          {emailError ? (
            <p id="login-email-error" className="auth-field-error" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (serverError) setServerError('')
          }}
          autoComplete="current-password"
          maxLength={FIELD_LIMITS.password}
        />

        <div className="auth-field-row">
          <Link to={ROUTES.forgotPassword} className="auth-forgot-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  )
}

export default LoginPage
