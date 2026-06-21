import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import AuthErrorAlert from '../components/auth/AuthErrorAlert'
import { authApi } from '../services/api'
import { ROUTES } from '../routes'
import { trimValue } from '../utils/authValidation'
import { AUTH_MESSAGES } from '../constants/authMessages'

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const confirmed = location.state?.confirmed
  const confirmedEmail = location.state?.email

  const [email, setEmail] = useState(confirmedEmail || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    setError('')

    const trimmedEmail = trimValue(email)
    if (!trimmedEmail) {
      setError(AUTH_MESSAGES.FILL_REQUIRED_FIELDS)
      return
    }

    setLoading(true)
    try {
      await authApi.forgotPassword({ email: trimmedEmail })
      navigate(ROUTES.forgotPassword, {
        state: { email: trimmedEmail, confirmed: true },
        replace: true,
      })
    } catch (err) {
      setError(err.message || 'Unable to send reset email')
    } finally {
      setLoading(false)
    }
  }

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
        {error ? <AuthErrorAlert message={error} /> : null}

        <div className={`auth-field${error ? ' auth-field--error' : ''}`}>
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthCard>
  )
}

export default ForgotPasswordPage
