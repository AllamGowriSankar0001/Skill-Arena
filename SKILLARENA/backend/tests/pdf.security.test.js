/**
 * Phase 6C — API ↔ PDF service client hardening tests.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('resumePdfService message sanitization', () => {
  test('strips filesystem paths from PDF service errors', () => {
    const { sanitizePdfServiceMessage } = require('../src/services/resumePdfService');
    assert.equal(
      sanitizePdfServiceMessage('Error in C:\\Users\\x\\app\\.env'),
      'PDF generation failed.',
    );
    assert.equal(
      sanitizePdfServiceMessage('Error in /home/ubuntu/backend/.env'),
      'PDF generation failed.',
    );
    assert.equal(sanitizePdfServiceMessage('Request body too large.'), 'Request body too large.');
  });

  test('rejects oversized PDF buffers from the service', async () => {
    const previous = process.env.PDF_MAX_RESPONSE_BYTES;
    process.env.PDF_MAX_RESPONSE_BYTES = '100';
    delete require.cache[require.resolve('../src/services/resumePdfService')];

    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array(200).buffer,
    });

    try {
      const { renderResumePdf } = require('../src/services/resumePdfService');
      await assert.rejects(
        () => renderResumePdf({ name: 'Ada', summary: 'x', skills: [] }),
        (error) => error.code === 'PDF_TOO_LARGE' && error.statusCode === 500,
      );
    } finally {
      global.fetch = originalFetch;
      if (previous === undefined) delete process.env.PDF_MAX_RESPONSE_BYTES;
      else process.env.PDF_MAX_RESPONSE_BYTES = previous;
      delete require.cache[require.resolve('../src/services/resumePdfService')];
    }
  });

  test('forwards service secret header when configured', async () => {
    const previousSecret = process.env.PDF_SERVICE_SECRET;
    process.env.PDF_SERVICE_SECRET = 'unit-test-pdf-secret';
    delete require.cache[require.resolve('../src/services/resumePdfService')];

    let seenHeaders = null;
    const originalFetch = global.fetch;
    global.fetch = async (_url, options) => {
      seenHeaders = options.headers;
      return {
        ok: true,
        arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer, // %PDF
      };
    };

    try {
      const { renderResumePdf } = require('../src/services/resumePdfService');
      const buffer = await renderResumePdf({ name: 'Ada', summary: 'x', skills: [] });
      assert.equal(seenHeaders['X-PDF-Service-Secret'], 'unit-test-pdf-secret');
      assert.ok(buffer.length > 0);
    } finally {
      global.fetch = originalFetch;
      if (previousSecret === undefined) delete process.env.PDF_SERVICE_SECRET;
      else process.env.PDF_SERVICE_SECRET = previousSecret;
      delete require.cache[require.resolve('../src/services/resumePdfService')];
    }
  });
});
