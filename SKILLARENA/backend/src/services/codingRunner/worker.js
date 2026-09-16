/**
 * Isolated coding worker entrypoint.
 * Spawned by the API with a minimal environment (no app secrets).
 * Reads one JSON job from stdin; writes one JSON result to stdout.
 */
const { evaluateCodingJob } = require('./evaluateCore');

const readStdin = () =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const MAX = 400_000;
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      total += Buffer.byteLength(chunk);
      if (total > MAX) {
        reject(Object.assign(new Error('INPUT_TOO_LARGE'), { code: 'INPUT_TOO_LARGE' }));
        process.stdin.destroy();
        return;
      }
      chunks.push(chunk);
    });
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });

const main = async () => {
  try {
    const raw = await readStdin();
    const job = JSON.parse(raw || '{}');
    const code = job.code || {};
    const testCases = job.testCases || [];
    const result = evaluateCodingJob(
      {
        html: code.html || '',
        css: code.css || '',
        javascript: code.javascript || '',
      },
      testCases,
    );
    process.stdout.write(JSON.stringify({ ok: true, result }));
  } catch (error) {
    const safe = {
      ok: false,
      code: error.code || 'WORKER_FAILED',
      message:
        error.code === 'INPUT_TOO_LARGE'
          ? 'Execution input too large.'
          : 'Execution failed.',
    };
    process.stdout.write(JSON.stringify(safe));
    process.exitCode = 1;
  }
};

main();
