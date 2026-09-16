import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import AuthErrorAlert from '../components/auth/AuthErrorAlert'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import { ROUTES } from '../routes'
import {
  FIELD_LIMITS,
  getEmailError,
  isForgotPasswordFormReady,
  trimValue,
} from '../utils/authValidation'

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { bootstrapping } = useAuth()
  const confirmed = location.state?.confirmed
  const confirmedEmail = location.state?.email

  const [email, setEmail] = useState(confirmedEmail || '')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const emailError = useMemo(() => getEmailError(email), [email])
  const formReady = useMemo(() => isForgotPasswordFormReady({ email }), [email])

  if (bootstrapping) {
    return (
      <div className="app-loading-bone">
        <PageLoadingSkeleton label="Loading recovery page" />
      </div>
    )
  }

  if (confirmed) {
    return (
      <AuthCard
        eyebrow="Check your inbox"
        title="Confirmation mail sent"
        description="If an account exists for that email, we sent password reset instructions. Open the link in the email to choose a new password."
        footer={<AuthFooterLink to={ROUTES.login}>Back to sign in</AuthFooterLink>}
      >
        <div className="auth-confirmation">
          <p className="auth-success" role="status">
            A confirmation email has been sent{confirmedEmail ? ` to ${confirmedEmail}` : ''}.
          </p>
          <p className="auth-confirmation-note">
            Did not receive it? Check spam or try again in a few minutes.
          </p>
          <Link
            to={ROUTES.forgotPassword}
            className="auth-inline-link"
            onClick={() => navigate(ROUTES.forgotPassword, { replace: true, state: null })}
          >
            Send another email
          </Link>
        </div>
      </AuthCard>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')

    if (!formReady) return

    const trimmedEmail = trimValue(email)
    setLoading(true)
    try {
      await authApi.forgotPassword({ email: trimmedEmail })
      navigate(ROUTES.forgotPassword, {
        state: { email: trimmedEmail, confirmed: true },
        replace: true,
      })
    } catch (err) {
      setServerError(err.message || 'Unable to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = formReady && !loading

  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Forgot password?"
      description="Enter the email linked to your Skill Arena account. We will send a confirmation message with reset instructions."
      footer={
        <>
          <AuthFooterLink to={ROUTES.login}>Back to sign in</AuthFooterLink>
          <AuthFooterLink to={ROUTES.signup}>Create a free account</AuthFooterLink>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError ? <AuthErrorAlert message={serverError} /> : null}

        <div className={`auth-field${emailError ? ' auth-field--error' : ''}`}>
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
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
            aria-describedby={emailError ? 'forgot-email-error' : undefined}
          />
          {emailError ? (
            <p id="forgot-email-error" className="auth-field-error" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthCard>
  )
}

export default ForgotPasswordPage
