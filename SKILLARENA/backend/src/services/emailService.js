/**
 * Optional SMTP email delivery. When SMTP is not configured, reset still succeeds
 * server-side (token stored) but no email is sent — same API response either way.
 * Never logs the reset token or password.
 */
const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      console.info(
        '[email] SMTP_HOST not set — password reset email skipped (token stored server-side).',
      );
    }
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  // Lazy-require so environments without nodemailer still boot if SMTP unused.
  let nodemailer;
  try {
    // Optional dependency — install when enabling SMTP.
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    nodemailer = require('nodemailer');
  } catch {
    console.warn('[email] nodemailer is not installed; cannot send password reset email.');
    return { sent: false, reason: 'NODEMAILER_MISSING' };
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@skillarena.local';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your Skill Arena password',
    text: [
      'We received a request to reset your Skill Arena password.',
      '',
      `Open this link to choose a new password (expires soon):`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  });

  return { sent: true };
};

module.exports = {
  sendPasswordResetEmail,
};
