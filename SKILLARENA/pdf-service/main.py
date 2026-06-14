import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from compile_engine import compile_latex, find_latex_engine
from latex_builder import build_resume_latex
from pdf_cache import get_cached_pdf, store_cached_pdf

SERVICE_PORT = int(os.getenv('PDF_SERVICE_PORT', '8001'))


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
        print('[pdf-service] Engine warmed up and ready.')
    except Exception as error:
        print(f'[pdf-service] Warmup skipped: {error}')


def render_resume_pdf(ats: dict) -> bytes:
    cached = get_cached_pdf(ats)
    if cached:
        return cached

    tex_source = build_resume_latex(ats)
    pdf_bytes = compile_latex(tex_source)
    store_cached_pdf(ats, pdf_bytes)
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

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == '/health':
            try:
                engine_name, engine_path = find_latex_engine()
                self._send_json(
                    200,
                    {'status': 'ok', 'engine': engine_name, 'path': engine_path},
                )
            except RuntimeError as error:
                self._send_json(503, {'status': 'degraded', 'message': str(error)})
            return

        self._send_json(404, {'detail': 'Not found'})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != '/render':
            self._send_json(404, {'detail': 'Not found'})
            return

        length = int(self.headers.get('Content-Length', '0') or 0)
        raw = self.rfile.read(length) if length else b'{}'

        try:
            payload = json.loads(raw.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            self._send_json(400, {'detail': 'Invalid JSON payload.'})
            return

        ats = payload.get('ats') if isinstance(payload, dict) else None
        if not isinstance(ats, dict):
            self._send_json(400, {'detail': 'Missing ats payload.'})
            return

        if not ats.get('name') and not ats.get('summary') and not ats.get('skills'):
            self._send_json(400, {'detail': 'Resume payload is empty.'})
            return

        try:
            cached = get_cached_pdf(ats)
            pdf_bytes = cached if cached else render_resume_pdf(ats)
            cache_status = 'HIT' if cached else 'MISS'
        except RuntimeError as error:
            self._send_json(500, {'detail': str(error)})
            return
        except Exception as error:
            self._send_json(500, {'detail': f'PDF render failed: {error}'})
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Content-Disposition', 'inline; filename="resume.pdf"')
        self.send_header('Content-Length', str(len(pdf_bytes)))
        self.send_header('X-Cache', cache_status)
        self.end_headers()
        self.wfile.write(pdf_bytes)

    def log_message(self, format: str, *args) -> None:
        print(f'[pdf-service] {self.address_string()} - {format % args}')


def run() -> None:
    server = ThreadingHTTPServer(('0.0.0.0', SERVICE_PORT), PdfServiceHandler)
    threading.Thread(target=warmup_engine, daemon=True).start()
    print(f'Skill Arena PDF service listening on http://127.0.0.1:{SERVICE_PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down PDF service.')
        server.server_close()


if __name__ == '__main__':
    run()
