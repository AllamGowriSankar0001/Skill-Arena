import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import AuthErrorAlert from '../components/auth/AuthErrorAlert'
import PasswordField from '../components/auth/PasswordField'
import { authApi } from '../services/api'
import { ROUTES } from '../routes'
import {
  FIELD_LIMITS,
  getConfirmPasswordError,
  getPasswordError,
  isResetPasswordFormReady,
} from '../utils/authValidation'

const ResetPasswordPage = () => {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') || '', [params])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const passwordError = useMemo(() => getPasswordError(password), [password])
  const confirmError = useMemo(
    () => getConfirmPasswordError(password, confirmPassword),
    [password, confirmPassword],
  )
  const formReady = useMemo(
    () => isResetPasswordFormReady({ password, confirmPassword }),
    [password, confirmPassword],
  )

  if (!token) {
    return (
      <AuthCard
        eyebrow="Reset password"
        title="Invalid reset link"
        description="This password reset link is missing or incomplete. Request a new link from the forgot password page."
        footer={<AuthFooterLink to={ROUTES.forgotPassword}>Request a new link</AuthFooterLink>}
      />
    )
  }

  if (done) {
    return (
      <AuthCard
        eyebrow="Password updated"
        title="You can sign in now"
        description="Your password was changed successfully. Use your new password to sign in."
        footer={<AuthFooterLink to={ROUTES.login}>Back to sign in</AuthFooterLink>}
      />
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')

    if (!formReady) return

    setLoading(true)
    try {
      await authApi.resetPassword({ token, password, confirmPassword })
      setDone(true)
    } catch (err) {
      setServerError(err.message || 'Unable to reset password')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = formReady && !loading

  return (
    <AuthCard
      eyebrow="Reset password"
      title="Choose a new password"
      description="Enter a strong password for your Skill Arena account."
      footer={<AuthFooterLink to={ROUTES.login}>Back to sign in</AuthFooterLink>}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError ? <AuthErrorAlert message={serverError} /> : null}

        <PasswordField
          id="reset-password"
          label="New password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (serverError) setServerError('')
          }}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
          hasError={Boolean(passwordError)}
          errorMessage={passwordError || ''}
        />

        <PasswordField
          id="reset-confirm"
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            if (serverError) setServerError('')
          }}
          autoComplete="new-password"
          maxLength={FIELD_LIMITS.password}
          hasError={Boolean(confirmError)}
          errorMessage={confirmError || ''}
        />

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  )
}

export default ResetPasswordPage
