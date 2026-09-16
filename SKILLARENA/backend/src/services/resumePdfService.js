const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://127.0.0.1:8001';
const PDF_SERVICE_SECRET = process.env.PDF_SERVICE_SECRET || '';
const PDF_FETCH_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.PDF_FETCH_TIMEOUT_MS) || 120_000,
);
const DEFAULT_MAX_PDF_RESPONSE_BYTES = 5 * 1024 * 1024;

const getMaxPdfResponseBytes = () => {
  if (process.env.PDF_MAX_RESPONSE_BYTES) {
    const parsed = Number(process.env.PDF_MAX_RESPONSE_BYTES);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_PDF_RESPONSE_BYTES;
};

const isPdfServiceConnectionError = (error) =>
  error?.code === 'ECONNREFUSED' ||
  error?.cause?.code === 'ECONNREFUSED' ||
  error?.name === 'TimeoutError' ||
  /fetch failed|aborted|timeout/i.test(String(error?.message || ''));

const createPdfServiceUnavailableError = () => {
  const error = new Error('PDF generation is temporarily unavailable.');
  error.statusCode = 503;
  error.code = 'PDF_SERVICE_UNAVAILABLE';
  return error;
};

const sanitizePdfServiceMessage = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return 'PDF generation failed.';
  // Never forward filesystem paths or long TeX logs to clients.
  if (/[A-Za-z]:\\|\/(?:Users|home|app|var|etc|tmp)\//i.test(text) || text.length > 200) {
    return 'PDF generation failed.';
  }
  return text.slice(0, 200);
};

const renderResumePdf = async (ats) => {
  const headers = { 'Content-Type': 'application/json' };
  if (PDF_SERVICE_SECRET) {
    headers['X-PDF-Service-Secret'] = PDF_SERVICE_SECRET;
  }

  let response;
  try {
    response = await fetch(`${PDF_SERVICE_URL}/render`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ats }),
      signal: AbortSignal.timeout(PDF_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isPdfServiceConnectionError(error)) {
      throw createPdfServiceUnavailableError();
    }
    throw error;
  }

  if (!response.ok) {
    let message = 'PDF generation failed.';
    try {
      const data = await response.json();
      message = sanitizePdfServiceMessage(data.detail || data.message || message);
    } catch {
      message = 'PDF generation failed.';
    }
    const error = new Error(message);
    error.statusCode =
      response.status === 401 || response.status === 413 || response.status === 429
        ? response.status
        : response.status >= 500
          ? 503
          : response.status;
    error.code =
      response.status === 401
        ? 'PDF_SERVICE_UNAUTHORIZED'
        : response.status === 429
          ? 'PDF_SERVICE_BUSY'
          : 'PDF_SERVICE_FAILED';
    throw error;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const maxBytes = getMaxPdfResponseBytes();
  if (buffer.length > maxBytes) {
    const error = new Error('Generated PDF exceeded size limit.');
    error.statusCode = 500;
    error.code = 'PDF_TOO_LARGE';
    throw error;
  }

  return buffer;
};

module.exports = {
  renderResumePdf,
  sanitizePdfServiceMessage,
  getMaxPdfResponseBytes,
  PDF_FETCH_TIMEOUT_MS,
};
