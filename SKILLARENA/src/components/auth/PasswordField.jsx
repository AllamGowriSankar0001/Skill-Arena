import { useState } from 'react'

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6A2.8 2.8 0 0 0 12 15.2a2.8 2.8 0 0 0 2.2-1.1" />
    <path d="M6.7 6.8C4.6 8.3 3 10.4 2.5 12c0 0 3.5 6.5 9.5 6.5 1.6 0 3-.4 4.2-1" />
    <path d="M14.5 7.8c1 .7 1.8 1.7 2.4 2.9" />
    <path d="M9.5 5.3C10.3 5.1 11.1 5 12 5c6 0 9.5 6.5 9.5 6.5a12.7 12.7 0 0 1-2.6 3.4" />
  </svg>
)

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  maxLength,
  required = false,
  hasError = false,
  errorMessage = '',
}) {
  const [visible, setVisible] = useState(false)
  const describedBy = errorMessage ? `${id}-error` : undefined

  return (
    <div className={`auth-field${hasError || errorMessage ? ' auth-field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          required={required}
          aria-invalid={hasError || Boolean(errorMessage) || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {errorMessage ? (
        <p id={describedBy} className="auth-field-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

export default PasswordField
