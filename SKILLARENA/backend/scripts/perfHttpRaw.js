/**
 * Binary-capable HTTP helper (no Sec-Fetch headers).
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

async function requestRaw(method, absoluteUrl, { headers = {}, body, timeoutMs = 120000 } = {}) {
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
          Accept: '*/*',
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
          const buf = Buffer.concat(chunks);
          const ms = Number(process.hrtime.bigint() - started) / 1e6;
          let json = null;
          const ct = String(res.headers['content-type'] || '');
          if (ct.includes('application/json')) {
            try {
              json = JSON.parse(buf.toString('utf8'));
            } catch {
              /* ignore */
            }
          }
          resolve({
            status: res.statusCode,
            ms: Math.round(ms * 100) / 100,
            bytes: buf.length,
            buffer: buf,
            json,
            headers: res.headers,
            cache: res.headers['x-cache'] || null,
          });
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', (error) => {
      resolve({
        status: null,
        ms: Number(process.hrtime.bigint() - started) / 1e6,
        bytes: 0,
        error: error.message,
      });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = { requestRaw };
