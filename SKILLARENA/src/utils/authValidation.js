import { AUTH_MESSAGES } from '../constants/authMessages'

const NAME_MAX_LENGTH = 80
const EMAIL_MAX_LENGTH = 254
const PASSWORD_MAX_LENGTH = 128
const NAME_PATTERN = /^[A-Za-z ]+$/
const EMAIL_CHARS_PATTERN = /^[a-zA-Z0-9@.]+$/
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_CHARS_PATTERN = /^[A-Za-z0-9@#$&*]+$/
const PASSWORD_STRENGTH_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@#$&*]).{6,}$/

export const trimValue = (value) => (typeof value === 'string' ? value.trim() : '')

/** Empty fields return null (no live error). Invalid non-empty values return a message. */
export const getNameError = (name) => {
  const trimmed = trimValue(name)
  if (!trimmed) return null
  if (trimmed.length > NAME_MAX_LENGTH) return AUTH_MESSAGES.EXCEED_LENGTH
  if (!NAME_PATTERN.test(trimmed)) return AUTH_MESSAGES.NAME_ALPHABETS_ONLY
  return null
}

export const getEmailError = (email) => {
  const trimmed = trimValue(email)
  if (!trimmed) return null
  if (trimmed.length > EMAIL_MAX_LENGTH) return AUTH_MESSAGES.EXCEED_LENGTH
  if (!EMAIL_CHARS_PATTERN.test(trimmed)) return AUTH_MESSAGES.EMAIL_SPECIAL_CHARS
  if (!EMAIL_FORMAT_PATTERN.test(trimmed)) return AUTH_MESSAGES.INVALID_EMAIL_FORMAT
  return null
}

export const getPasswordError = (password) => {
  const trimmed = trimValue(password)
  if (!trimmed) return null
  if (trimmed.length > PASSWORD_MAX_LENGTH) return AUTH_MESSAGES.EXCEED_LENGTH
  if (!PASSWORD_CHARS_PATTERN.test(trimmed)) return AUTH_MESSAGES.PASSWORD_SPECIAL_CHARS
  if (!PASSWORD_STRENGTH_PATTERN.test(trimmed)) return AUTH_MESSAGES.WEAK_PASSWORD
  return null
}

export const getConfirmPasswordError = (password, confirmPassword) => {
  const trimmedConfirm = trimValue(confirmPassword)
  if (!trimmedConfirm) return null
  if (trimValue(password) !== trimmedConfirm) return AUTH_MESSAGES.PASSWORDS_DO_NOT_MATCH
  return null
}

export const isLoginFormReady = ({ email, password }) => {
  const trimmedEmail = trimValue(email)
  const trimmedPassword = trimValue(password)
  if (!trimmedEmail || !trimmedPassword) return false
  return !getEmailError(trimmedEmail)
}

export const isSignupFormReady = ({ name, email, password, confirmPassword }) => {
  const trimmedName = trimValue(name)
  const trimmedEmail = trimValue(email)
  const trimmedPassword = trimValue(password)
  const trimmedConfirm = trimValue(confirmPassword)

  if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedConfirm) return false
  if (getNameError(trimmedName)) return false
  if (getEmailError(trimmedEmail)) return false
  if (getPasswordError(trimmedPassword)) return false
  if (getConfirmPasswordError(trimmedPassword, trimmedConfirm)) return false
  return true
}

export const isForgotPasswordFormReady = ({ email }) => {
  const trimmedEmail = trimValue(email)
  if (!trimmedEmail) return false
  return !getEmailError(trimmedEmail)
}

export const isResetPasswordFormReady = ({ password, confirmPassword }) => {
  const trimmedPassword = trimValue(password)
  const trimmedConfirm = trimValue(confirmPassword)
  if (!trimmedPassword || !trimmedConfirm) return false
  if (getPasswordError(trimmedPassword)) return false
  if (getConfirmPasswordError(trimmedPassword, trimmedConfirm)) return false
  return true
}

export const validateLoginForm = ({ email, password }) => {
  const trimmedEmail = trimValue(email)
  const trimmedPassword = trimValue(password)

  if (!trimmedEmail || !trimmedPassword) {
    return {
      ok: false,
      message: AUTH_MESSAGES.FILL_REQUIRED_FIELDS,
      field: !trimmedEmail ? 'email' : 'password',
    }
  }

  const emailError = getEmailError(trimmedEmail)
  if (emailError) {
    return { ok: false, message: emailError, field: 'email' }
  }

  return {
    ok: true,
    email: trimmedEmail,
    password: trimmedPassword,
  }
}

export const validateSignupForm = ({ name, email, password, confirmPassword }) => {
  const trimmedName = trimValue(name)
  const trimmedEmail = trimValue(email)
  const trimmedPassword = trimValue(password)
  const trimmedConfirm = trimValue(confirmPassword)

  if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedConfirm) {
    const field = !trimmedName
      ? 'name'
      : !trimmedEmail
        ? 'email'
        : !trimmedPassword
          ? 'password'
          : 'confirmPassword'
    return { ok: false, message: AUTH_MESSAGES.SIGNUP_FILL_REQUIRED, field }
  }

  const nameError = getNameError(trimmedName)
  if (nameError) return { ok: false, message: nameError, field: 'name' }

  const emailError = getEmailError(trimmedEmail)
  if (emailError) return { ok: false, message: emailError, field: 'email' }

  const passwordError = getPasswordError(trimmedPassword)
  if (passwordError) return { ok: false, message: passwordError, field: 'password' }

  const confirmError = getConfirmPasswordError(trimmedPassword, trimmedConfirm)
  if (confirmError) return { ok: false, message: confirmError, field: 'confirmPassword' }

  return {
    ok: true,
    name: trimmedName,
    email: trimmedEmail,
    password: trimmedPassword,
  }
}

export const FIELD_LIMITS = {
  name: NAME_MAX_LENGTH,
  email: EMAIL_MAX_LENGTH,
  password: PASSWORD_MAX_LENGTH,
}
