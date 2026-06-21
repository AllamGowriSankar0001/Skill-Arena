const { validateLoginFields, validateSignupFields } = require('../backend/src/utils/authValidation');
const MSG = require('../backend/src/constants/authMessages');

const check = (id, condition, got, expected) => {
  if (condition) {
    console.log(`PASS ${id}`);
    return 0;
  }
  console.log(`FAIL ${id}\n  got: ${JSON.stringify(got)}\n  exp: ${JSON.stringify(expected)}`);
  return 1;
};

let fails = 0;
const sp = (d) =>
  validateSignupFields({
    confirmPassword: d.confirmPassword ?? d.password,
    ...d,
  });

const cases = [
  ['TC_Login_05', () => validateLoginFields({ email: '', password: '' }).message, MSG.FILL_REQUIRED_FIELDS],
  ['TC_Login_06', () => validateLoginFields({ email: '', password: '123456' }).message, MSG.FILL_REQUIRED_FIELDS],
  ['TC_Login_07', () => validateLoginFields({ email: 'testuser@gmail.com', password: '' }).message, MSG.FILL_REQUIRED_FIELDS],
  ['TC_Login_16', () => validateLoginFields({ email: '   testuser@gmail.com   ', password: '   123456   ' }).ok, true],
  ['TC_Signup_03', () => sp({ name: 'TestUser', email: 'testusergmail', password: 'p@s$w0rd' }).message, MSG.INVALID_EMAIL_FORMAT],
  ['TC_Signup_04', () => sp({ name: 'TestUser', email: 'testuser01@gmail.com', password: '123456' }).message, MSG.WEAK_PASSWORD],
  ['TC_Signup_05', () => sp({ name: '', email: '', password: '' }).message, MSG.SIGNUP_FILL_REQUIRED],
  ['TC_Signup_09', () => sp({ name: '   ', email: '   ', password: '   ' }).message, MSG.SIGNUP_FILL_REQUIRED],
  ['TC_Signup_16', () => sp({ name: "'1'='1", email: 'testuser01@gmail.com', password: 'p@s$w0rd' }).message, MSG.NAME_ALPHABETS_ONLY],
  ['TC_Signup_17', () => sp({ name: 'TestUser', email: 'testuser01@gmail.com', password: "<script>alert('Hacked')</script>" }).message, MSG.PASSWORD_SPECIAL_CHARS],
  ['TC_Signup_18', () => sp({ name: 'TestUser', email: "testuser01'@gmail.com", password: 'p@s$w0rd' }).message, MSG.EMAIL_SPECIAL_CHARS],
  ['TC_Signup_14', () => sp({ name: 'A'.repeat(81), email: 'testuser01@gmail.com', password: 'p@s$w0rd' }).message, MSG.EXCEED_LENGTH],
];

for (const [id, fn, expected] of cases) {
  const got = fn();
  fails += check(id, got === expected, got, expected);
}

console.log('Total fails:', fails);
process.exit(fails > 0 ? 1 : 0);
