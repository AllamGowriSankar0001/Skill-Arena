import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import PasswordField from '../components/auth/PasswordField'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import { getHomeRouteForUser, ROUTES } from '../routes'
import { FIELD_LIMITS, validateSignupForm } from '../utils/authValidation'

const SignupPage = () => {
  const navigate = useNavigate()
  const { loading, isAuthenticated, bootstrapping, user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) {
      navigate(getHomeRouteForUser(user), { replace: true })
    }
  }, [bootstrapping, isAuthenticated, navigate, user])

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
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const validation = validateSignupForm({ name, email, password, confirmPassword })
    if (!validation.ok) {
      setError(validation.message)
      return
    }

    setSubmitting(true)
    try {
      await authApi.signup({
        name: validation.name,
        email: validation.email,
        password: validation.password,
        confirmPassword,
      })
      navigate(ROUTES.login, {
        replace: true,
        state: { signupSuccess: 'Account created successfully. Please sign in.' },
      })
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  const busy = loading || submitting

  return (
    <AuthCard
      eyebrow="Create account"
      title="Join Skill Arena"
      description="Set up your account to use the AI Resume Builder and get ready for upcoming Learn, Practice, and Battle features."
      footer={
        <>
          <AuthFooterLink to={ROUTES.login}>Already have an account? Sign in</AuthFooterLink>
          <AuthFooterLink to={ROUTES.home}>Back to homepage</AuthFooterLink>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="auth-field">
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={FIELD_LIMITS.name}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={FIELD_LIMITS.email}
          />
        </div>

        <PasswordField
          id="signup-password"
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
        />

        <PasswordField
          id="signup-confirm-password"
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
        />

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  )
}

export default SignupPage
