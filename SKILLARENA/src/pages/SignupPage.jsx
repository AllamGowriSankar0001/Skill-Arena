import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import AuthErrorAlert from '../components/auth/AuthErrorAlert'
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
  const [errorField, setErrorField] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const clearFieldError = (field) => {
    if (errorField === field) {
      setError('')
      setErrorField('')
    }
  }

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
    setErrorField('')

    const validation = validateSignupForm({ name, email, password, confirmPassword })
    if (!validation.ok) {
      setError(validation.message)
      setErrorField(validation.field || '')
      return
    }

    setSubmitting(true)
    try {
      await authApi.signup({
        name: validation.name,
        email: validation.email,
        password: validation.password,
        confirmPassword: validation.password,
      })
      navigate(ROUTES.login, {
        replace: true,
        state: { signupSuccess: 'Account created successfully. Please sign in.' },
      })
    } catch (err) {
      setError(err.message || 'Signup failed')
      setErrorField(err.message === 'This Email is already Existed' ? 'email' : '')
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
        {error ? <AuthErrorAlert message={error} field={errorField} /> : null}

        <div className={`auth-field${errorField === 'name' ? ' auth-field--error' : ''}`}>
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearFieldError('name')
            }}
            autoComplete="name"
            maxLength={FIELD_LIMITS.name}
            aria-invalid={errorField === 'name' || undefined}
          />
        </div>

        <div className={`auth-field${errorField === 'email' ? ' auth-field--error' : ''}`}>
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearFieldError('email')
            }}
            autoComplete="email"
            maxLength={FIELD_LIMITS.email}
            aria-invalid={errorField === 'email' || undefined}
          />
        </div>

        <PasswordField
          id="signup-password"
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearFieldError('password')
          }}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
          hasError={errorField === 'password'}
        />

        <PasswordField
          id="signup-confirm-password"
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            clearFieldError('confirmPassword')
          }}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
          hasError={errorField === 'confirmPassword'}
        />

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  )
}

export default SignupPage
