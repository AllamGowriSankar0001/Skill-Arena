const { spawn } = require('child_process');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const pdfServiceMain = path.resolve(backendRoot, '../pdf-service/main.py');

const pdfService = spawn('python', [pdfServiceMain], {
  cwd: path.dirname(pdfServiceMain),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const api = spawn('node', ['--watch', 'src/server.js'], {
  cwd: backendRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const shutdown = (code = 0) => {
  pdfService.kill();
  api.kill();
  process.exit(code);
};

pdfService.on('exit', (code) => {
  if (code) console.error(`[dev:all] PDF service exited with code ${code}`);
  shutdown(code || 0);
});

api.on('exit', (code) => {
  if (code) console.error(`[dev:all] API exited with code ${code}`);
  shutdown(code || 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev:all] Starting PDF service and API...');
