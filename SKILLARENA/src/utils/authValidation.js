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

  if (trimmedPassword !== trimmedConfirm) {
    return { ok: false, message: AUTH_MESSAGES.PASSWORDS_DO_NOT_MATCH, field: 'confirmPassword' }
  }

  if (trimmedName.length > NAME_MAX_LENGTH) {
    return { ok: false, message: AUTH_MESSAGES.EXCEED_LENGTH, field: 'name' }
  }

  if (!NAME_PATTERN.test(trimmedName)) {
    return { ok: false, message: AUTH_MESSAGES.NAME_ALPHABETS_ONLY, field: 'name' }
  }

  if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
    return { ok: false, message: AUTH_MESSAGES.EXCEED_LENGTH, field: 'email' }
  }

  if (!EMAIL_CHARS_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: AUTH_MESSAGES.EMAIL_SPECIAL_CHARS, field: 'email' }
  }

  if (!EMAIL_FORMAT_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: AUTH_MESSAGES.INVALID_EMAIL_FORMAT, field: 'email' }
  }

  if (trimmedPassword.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: AUTH_MESSAGES.EXCEED_LENGTH, field: 'password' }
  }

  if (!PASSWORD_CHARS_PATTERN.test(trimmedPassword)) {
    return { ok: false, message: AUTH_MESSAGES.PASSWORD_SPECIAL_CHARS, field: 'password' }
  }

  if (!PASSWORD_STRENGTH_PATTERN.test(trimmedPassword)) {
    return { ok: false, message: AUTH_MESSAGES.WEAK_PASSWORD, field: 'password' }
  }

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
