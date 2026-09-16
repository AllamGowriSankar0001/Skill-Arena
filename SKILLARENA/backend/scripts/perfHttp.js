/**
 * Minimal HTTP helper without undici Sec-Fetch-* headers
 * (those make authClientKind treat the caller as a browser cookie client).
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

async function requestJson(method, absoluteUrl, { headers = {}, body, timeoutMs = 30000 } = {}) {
  const url = new URL(absoluteUrl);
  const lib = url.protocol === 'https:' ? https : http;
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8');

  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Accept: 'application/json',
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': payload.length }
            : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const ms = Number(process.hrtime.bigint() - started) / 1e6;
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* ignore */
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            ms: Math.round(ms * 100) / 100,
            bytes: Buffer.byteLength(text, 'utf8'),
            json,
            text: text.slice(0, 240),
            headers: res.headers,
          });
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (error) => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      resolve({
        ok: false,
        status: null,
        ms: Math.round(ms * 100) / 100,
        error: error.message,
      });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = { requestJson };
