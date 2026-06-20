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
    return { ok: false, message: AUTH_MESSAGES.FILL_REQUIRED_FIELDS }
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
    return { ok: false, message: AUTH_MESSAGES.SIGNUP_FILL_REQUIRED }
  }

  if (trimmedPassword !== trimmedConfirm) {
    return { ok: false, message: AUTH_MESSAGES.PASSWORDS_DO_NOT_MATCH }
  }

  if (trimmedName.length > NAME_MAX_LENGTH) {
    return { ok: false, message: AUTH_MESSAGES.EXCEED_LENGTH }
  }

  if (!NAME_PATTERN.test(trimmedName)) {
    return { ok: false, message: AUTH_MESSAGES.NAME_ALPHABETS_ONLY }
  }

  if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
    return { ok: false, message: AUTH_MESSAGES.EXCEED_LENGTH }
  }

  if (!EMAIL_CHARS_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: AUTH_MESSAGES.EMAIL_SPECIAL_CHARS }
  }

  if (!EMAIL_FORMAT_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: AUTH_MESSAGES.INVALID_EMAIL_FORMAT }
  }

  if (trimmedPassword.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: AUTH_MESSAGES.EXCEED_LENGTH }
  }

  if (!PASSWORD_CHARS_PATTERN.test(trimmedPassword)) {
    return { ok: false, message: AUTH_MESSAGES.PASSWORD_SPECIAL_CHARS }
  }

  if (!PASSWORD_STRENGTH_PATTERN.test(trimmedPassword)) {
    return { ok: false, message: AUTH_MESSAGES.WEAK_PASSWORD }
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
