import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import AuthErrorAlert from '../components/auth/AuthErrorAlert'
import PasswordField from '../components/auth/PasswordField'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import { getHomeRouteForUser, ROUTES } from '../routes'
import {
  FIELD_LIMITS,
  getConfirmPasswordError,
  getEmailError,
  getNameError,
  getPasswordError,
  isSignupFormReady,
  validateSignupForm,
} from '../utils/authValidation'

const SignupPage = () => {
  const navigate = useNavigate()
  const { loading, isAuthenticated, bootstrapping, user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [serverError, setServerError] = useState('')
  const [serverErrorField, setServerErrorField] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nameError = useMemo(() => getNameError(name), [name])
  const emailError = useMemo(() => getEmailError(email), [email])
  const passwordError = useMemo(() => getPasswordError(password), [password])
  const confirmError = useMemo(
    () => getConfirmPasswordError(password, confirmPassword),
    [password, confirmPassword],
  )
  const formReady = useMemo(
    () => isSignupFormReady({ name, email, password, confirmPassword }),
    [name, email, password, confirmPassword],
  )

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) {
      navigate(getHomeRouteForUser(user), { replace: true })
    }
  }, [bootstrapping, isAuthenticated, navigate, user])

  if (bootstrapping) {
    return (
      <div className="app-loading-bone">
        <PageLoadingSkeleton label="Loading sign up" />
      </div>
    )
  }

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')
    setServerErrorField('')

    const validation = validateSignupForm({ name, email, password, confirmPassword })
    if (!validation.ok) {
      setServerError(validation.message)
      setServerErrorField(validation.field || '')
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
      setServerError(err.message || 'Signup failed')
      setServerErrorField(err.message === 'This Email is already Existed' ? 'email' : '')
    } finally {
      setSubmitting(false)
    }
  }

  const busy = loading || submitting
  const canSubmit = formReady && !busy

  return (
    <AuthCard
      eyebrow="Create account"
      title="Join Skill Arena"
      description="Create your free account to start learning, practicing, and battling."
      panelTitle="Build skills. Prove them."
      panelDescription="Join students who learn together, compete fairly, and track progress every week."
      footer={<AuthFooterLink to={ROUTES.login}>Already have an account? Sign in</AuthFooterLink>}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError ? <AuthErrorAlert message={serverError} field={serverErrorField} /> : null}

        <div
          className={`auth-field${nameError || serverErrorField === 'name' ? ' auth-field--error' : ''}`}
        >
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (serverErrorField === 'name') {
                setServerError('')
                setServerErrorField('')
              }
            }}
            autoComplete="name"
            maxLength={FIELD_LIMITS.name}
            aria-invalid={Boolean(nameError) || serverErrorField === 'name' || undefined}
            aria-describedby={nameError ? 'signup-name-error' : undefined}
          />
          {nameError ? (
            <p id="signup-name-error" className="auth-field-error" role="alert">
              {nameError}
            </p>
          ) : null}
        </div>

        <div
          className={`auth-field${emailError || serverErrorField === 'email' ? ' auth-field--error' : ''}`}
        >
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (serverErrorField === 'email') {
                setServerError('')
                setServerErrorField('')
              }
            }}
            autoComplete="email"
            maxLength={FIELD_LIMITS.email}
            aria-invalid={Boolean(emailError) || serverErrorField === 'email' || undefined}
            aria-describedby={emailError ? 'signup-email-error' : undefined}
          />
          {emailError ? (
            <p id="signup-email-error" className="auth-field-error" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>

        <PasswordField
          id="signup-password"
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
          hasError={Boolean(passwordError)}
          errorMessage={passwordError || ''}
        />

        <PasswordField
          id="signup-confirm-password"
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
          hasError={Boolean(confirmError)}
          errorMessage={confirmError || ''}
        />

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  )
}

export default SignupPage
