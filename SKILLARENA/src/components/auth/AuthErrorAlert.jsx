const FIELD_LABELS = {
  name: 'Full name',
  email: 'Email',
  password: 'Password',
  confirmPassword: 'Confirm password',
}

export function AuthErrorAlert({ message, field }) {
  if (!message) return null

  const fieldLabel = field ? FIELD_LABELS[field] : null

  return (
    <div className="auth-alert auth-alert--error" role="alert" aria-live="polite">
      <span className="auth-alert-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <circle cx="12" cy="16.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div className="auth-alert-content">
        <p className="auth-alert-title">Unable to continue</p>
        <p className="auth-alert-message">{message}</p>
        {fieldLabel ? (
          <p className="auth-alert-hint">
            Check the <strong>{fieldLabel}</strong> field below.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default AuthErrorAlert
