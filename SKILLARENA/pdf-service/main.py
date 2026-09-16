import json
import os
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from compile_engine import compile_latex, find_latex_engine
from latex_builder import build_resume_latex
from pdf_cache import get_cached_pdf, prune_cache, store_cached_pdf

SERVICE_PORT = int(os.getenv('PDF_SERVICE_PORT', '8001'))
# Bind to loopback by default — never expose publicly without intentional override.
SERVICE_HOST = os.getenv('PDF_SERVICE_HOST', '127.0.0.1')
PDF_SERVICE_SECRET = os.getenv('PDF_SERVICE_SECRET', '').strip()
MAX_BODY_BYTES = int(os.getenv('PDF_SERVICE_MAX_BODY_BYTES', str(512 * 1024)))
MAX_PDF_BYTES = int(os.getenv('PDF_SERVICE_MAX_PDF_BYTES', str(5 * 1024 * 1024)))
MAX_CONCURRENT = max(1, int(os.getenv('PDF_SERVICE_MAX_CONCURRENT', '2')))
REQUIRE_SECRET = os.getenv('PDF_SERVICE_REQUIRE_SECRET', '').strip().lower() in (
    '1',
    'true',
    'yes',
)

_RENDER_SLOTS = threading.Semaphore(MAX_CONCURRENT)

# Top-level keys that would imply URL/HTML rendering — not supported.
FORBIDDEN_PAYLOAD_KEYS = frozenset({'url', 'html', 'href', 'uri', 'page', 'src', 'file'})


def _is_loopback_host(host: str) -> bool:
    normalized = (host or '').strip().lower()
    return normalized in ('127.0.0.1', 'localhost', '::1', '[::1]')


def warmup_engine() -> None:
    try:
        dummy = {
            'name': 'Skill Arena',
            'role': 'Resume',
            'summary': 'PDF engine warmup.',
            'skills': [],
            'experiences': [],
            'projects': [],
            'educations': [],
        }
        tex_source = build_resume_latex(dummy)
        pdf_bytes = compile_latex(tex_source)
        store_cached_pdf(dummy, pdf_bytes)
        prune_cache()
        print('[pdf-service] Engine warmed up and ready.')
    except Exception as error:
        # Never print secrets; error may include engine paths — keep short.
        print(f'[pdf-service] Warmup skipped: {type(error).__name__}')


def render_resume_pdf(ats: dict) -> bytes:
    cached = get_cached_pdf(ats)
    if cached:
        return cached

    tex_source = build_resume_latex(ats)
    pdf_bytes = compile_latex(tex_source)
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise RuntimeError('PDF_TOO_LARGE')
    store_cached_pdf(ats, pdf_bytes)
    prune_cache()
    return pdf_bytes


class PdfServiceHandler(BaseHTTPRequestHandler):
    server_version = 'SkillArenaPdfService/1.0'

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        if not PDF_SERVICE_SECRET:
            # Loopback-only open mode for local development.
            return _is_loopback_host(SERVICE_HOST)
        provided = self.headers.get('X-PDF-Service-Secret', '') or ''
        try:
            return secrets.compare_digest(provided, PDF_SERVICE_SECRET)
        except (TypeError, ValueError):
            return False

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == '/health':
            # Health is intentionally unauthenticated for local probes,
            # but never discloses filesystem paths.
            try:
                engine_name, _engine_path = find_latex_engine()
                self._send_json(200, {'status': 'ok', 'engine': engine_name})
            except RuntimeError:
                self._send_json(
                    503,
                    {'status': 'degraded', 'message': 'LaTeX engine unavailable.'},
                )
            return

        self._send_json(404, {'detail': 'Not found'})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != '/render':
            self._send_json(404, {'detail': 'Not found'})
            return

        if not self._authorized():
            self._send_json(401, {'detail': 'Unauthorized.'})
            return

        length = int(self.headers.get('Content-Length', '0') or 0)
        if length < 0 or length > MAX_BODY_BYTES:
            self._send_json(413, {'detail': 'Request body too large.'})
            return

        raw = self.rfile.read(length) if length else b'{}'

        try:
            payload = json.loads(raw.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            self._send_json(400, {'detail': 'Invalid JSON payload.'})
            return

        if not isinstance(payload, dict):
            self._send_json(400, {'detail': 'Invalid JSON payload.'})
            return

        # Reject URL/HTML-style rendering contracts — structured ATS only.
        forbidden = FORBIDDEN_PAYLOAD_KEYS.intersection(payload.keys())
        if forbidden:
            self._send_json(
                400,
                {'detail': 'Unsupported render input. Structured ats payload only.'},
            )
            return

        ats = payload.get('ats')
        if not isinstance(ats, dict):
            self._send_json(400, {'detail': 'Missing ats payload.'})
            return

        if not ats.get('name') and not ats.get('summary') and not ats.get('skills'):
            self._send_json(400, {'detail': 'Resume payload is empty.'})
            return

        acquired = _RENDER_SLOTS.acquire(blocking=False)
        if not acquired:
            self._send_json(429, {'detail': 'Too many concurrent PDF renders.'})
            return

        try:
            cached = get_cached_pdf(ats)
            if cached:
                pdf_bytes = cached
                cache_status = 'HIT'
            else:
                pdf_bytes = render_resume_pdf(ats)
                cache_status = 'MISS'
        except RuntimeError as error:
            detail = (
                'Generated PDF exceeded size limit.'
                if str(error) == 'PDF_TOO_LARGE'
                else 'PDF generation failed.'
            )
            self._send_json(500, {'detail': detail})
            return
        except Exception:
            self._send_json(500, {'detail': 'PDF generation failed.'})
            return
        finally:
            _RENDER_SLOTS.release()

        if len(pdf_bytes) > MAX_PDF_BYTES:
            self._send_json(500, {'detail': 'Generated PDF exceeded size limit.'})
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Content-Disposition', 'inline; filename="resume.pdf"')
        self.send_header('Content-Length', str(len(pdf_bytes)))
        self.send_header('X-Cache', cache_status)
        self.end_headers()
        self.wfile.write(pdf_bytes)

    def log_message(self, format: str, *args) -> None:
        # Log method/path only — never headers, bodies, or secrets.
        print(f'[pdf-service] {self.address_string()} - {format % args}')


def assert_secure_startup() -> None:
    if SERVICE_HOST in ('0.0.0.0', '::', '[::]'):
        print(
            '[pdf-service] WARNING: binding to all interfaces is discouraged. '
            'Prefer PDF_SERVICE_HOST=127.0.0.1 and keep the service private.',
        )
        if not PDF_SERVICE_SECRET:
            raise SystemExit(
                '[pdf-service] Refusing to start: PDF_SERVICE_SECRET is required '
                'when binding to a non-loopback interface.',
            )

    if not _is_loopback_host(SERVICE_HOST) and not PDF_SERVICE_SECRET:
        raise SystemExit(
            '[pdf-service] Refusing to start: PDF_SERVICE_SECRET is required '
            'when PDF_SERVICE_HOST is not loopback.',
        )

    if REQUIRE_SECRET and not PDF_SERVICE_SECRET:
        raise SystemExit(
            '[pdf-service] Refusing to start: PDF_SERVICE_REQUIRE_SECRET is set '
            'but PDF_SERVICE_SECRET is empty.',
        )

    if not PDF_SERVICE_SECRET:
        print(
            '[pdf-service] WARNING: PDF_SERVICE_SECRET is not set. '
            'Open mode allowed only because host is loopback. '
            'Set a shared secret before any network exposure.',
        )


def run() -> None:
    assert_secure_startup()

    server = ThreadingHTTPServer((SERVICE_HOST, SERVICE_PORT), PdfServiceHandler)
    threading.Thread(target=warmup_engine, daemon=True).start()
    print(f'Skill Arena PDF service listening on http://{SERVICE_HOST}:{SERVICE_PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down PDF service.')
        server.server_close()


if __name__ == '__main__':
    run()
