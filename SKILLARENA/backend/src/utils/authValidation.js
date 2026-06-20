const MSG = require('../constants/authMessages');

const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;
const NAME_PATTERN = /^[A-Za-z ]+$/;
const EMAIL_CHARS_PATTERN = /^[a-zA-Z0-9@.]+$/;
const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_CHARS_PATTERN = /^[A-Za-z0-9@#$&*]+$/;
const PASSWORD_STRENGTH_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@#$&*]).{6,}$/;

const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

const validateSignupFields = ({ name, email, password, confirmPassword }) => {
  const trimmedName = trimValue(name);
  const trimmedEmail = trimValue(email);
  const trimmedPassword = trimValue(password);
  const trimmedConfirm = trimValue(confirmPassword);

  if (!trimmedName || !trimmedEmail || !trimmedPassword) {
    return { ok: false, message: MSG.SIGNUP_FILL_REQUIRED };
  }

  if (confirmPassword !== undefined && trimmedPassword !== trimmedConfirm) {
    return { ok: false, message: MSG.PASSWORDS_DO_NOT_MATCH };
  }

  if (trimmedName.length > NAME_MAX_LENGTH) {
    return { ok: false, message: MSG.EXCEED_LENGTH };
  }

  if (!NAME_PATTERN.test(trimmedName)) {
    return { ok: false, message: MSG.NAME_ALPHABETS_ONLY };
  }

  if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
    return { ok: false, message: MSG.EXCEED_LENGTH };
  }

  if (!EMAIL_CHARS_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: MSG.EMAIL_SPECIAL_CHARS };
  }

  if (!EMAIL_FORMAT_PATTERN.test(trimmedEmail)) {
    return { ok: false, message: MSG.INVALID_EMAIL_FORMAT };
  }

  if (trimmedPassword.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: MSG.EXCEED_LENGTH };
  }

  if (!PASSWORD_CHARS_PATTERN.test(trimmedPassword)) {
    return { ok: false, message: MSG.PASSWORD_SPECIAL_CHARS };
  }

  if (!PASSWORD_STRENGTH_PATTERN.test(trimmedPassword)) {
    return { ok: false, message: MSG.WEAK_PASSWORD };
  }

  return {
    ok: true,
    name: trimmedName,
    email: trimmedEmail.toLowerCase(),
    password: trimmedPassword,
  };
};

const validateLoginFields = ({ email, password }) => {
  const trimmedEmail = trimValue(email);
  const trimmedPassword = trimValue(password);

  if (!trimmedEmail || !trimmedPassword) {
    return { ok: false, message: MSG.FILL_REQUIRED_FIELDS };
  }

  return {
    ok: true,
    email: trimmedEmail.toLowerCase(),
    password: trimmedPassword,
  };
};

module.exports = {
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  validateSignupFields,
  validateLoginFields,
};
