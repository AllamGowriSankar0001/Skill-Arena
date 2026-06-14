const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://127.0.0.1:8001';

const isPdfServiceConnectionError = (error) =>
  error?.code === 'ECONNREFUSED' ||
  error?.cause?.code === 'ECONNREFUSED' ||
  /fetch failed/i.test(String(error?.message || ''));

const createPdfServiceUnavailableError = () => {
  const error = new Error(
    'PDF service is not running. In a second terminal, run: cd SKILLARENA/backend && npm run pdf-service',
  );
  error.statusCode = 503;
  error.code = 'PDF_SERVICE_UNAVAILABLE';
  return error;
};

const renderResumePdf = async (ats) => {
  let response;
  try {
    response = await fetch(`${PDF_SERVICE_URL}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ats }),
    });
  } catch (error) {
    if (isPdfServiceConnectionError(error)) {
      throw createPdfServiceUnavailableError();
    }
    throw error;
  }

  if (!response.ok) {
    let message = 'Resume PDF service failed.';
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    const error = new Error(message);
    error.statusCode = response.status >= 500 ? 503 : response.status;
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
};

module.exports = {
  renderResumePdf,
};
