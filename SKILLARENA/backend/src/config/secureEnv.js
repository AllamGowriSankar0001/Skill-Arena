const WEAK_JWT_PLACEHOLDERS = new Set([
  'change-this-to-a-long-random-secret-in-production',
  'secret',
  'jwt_secret',
  'changeme',
  'your-secret',
]);

const isProduction = () =>
  String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * Validate critical env before accepting traffic.
 * Never logs secret values.
 */
const assertSecureEnv = () => {
  const secret = process.env.JWT_SECRET;
  const production = isProduction();

  if (!secret || !String(secret).trim()) {
    throw new Error(
      'JWT_SECRET is required. Set a strong random value in backend/.env before starting the API.',
    );
  }

  const trimmed = String(secret).trim();

  if (production) {
    if (trimmed.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters in production.',
      );
    }
    if (WEAK_JWT_PLACEHOLDERS.has(trimmed.toLowerCase())) {
      throw new Error(
        'JWT_SECRET is using a known placeholder value. Set a unique strong secret for production.',
      );
    }

    const rawOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL;
    if (!rawOrigins || !String(rawOrigins).trim() || String(rawOrigins).trim() === '*') {
      throw new Error(
        'CLIENT_URL or CLIENT_URLS must be an explicit comma-separated origin allowlist in production (wildcard * is not allowed).',
      );
    }

    // Defense in depth: never allow reset-token debug leakage in production.
    if (process.env.AUTH_DEBUG_RESET_TOKEN === '1') {
      throw new Error(
        'AUTH_DEBUG_RESET_TOKEN must not be enabled in production.',
      );
    }

    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).trim()) {
      throw new Error('MONGODB_URI is required in production.');
    }

    if (!process.env.SMTP_HOST || !String(process.env.SMTP_HOST).trim()) {
      console.warn(
        '[security] SMTP_HOST is not set. Password-reset emails will not be delivered until SMTP is configured.',
      );
    }

    if (!process.env.PDF_SERVICE_SECRET || !String(process.env.PDF_SERVICE_SECRET).trim()) {
      console.warn(
        '[security] PDF_SERVICE_SECRET is empty. Set a shared secret if the PDF service is network-reachable.',
      );
    }
  } else if (trimmed.length < 16) {
    console.warn(
      '[security] JWT_SECRET is shorter than 16 characters. Use a longer secret before deploying to production.',
    );
  }
};

module.exports = {
  assertSecureEnv,
  isProduction,
};
