"""
Phase 6C PDF service security tests (stdlib unittest).
Does not require a live LaTeX engine for auth/input tests.
"""
import json
import os
import socket
import sys
import tempfile
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        return int(sock.getsockname()[1])


class LatexEscapeTests(unittest.TestCase):
    def test_backslash_commands_are_escaped(self):
        from latex_builder import escape_latex

        escaped = escape_latex(r'\write18{rm -rf /}')
        # TeX-special backslash and braces must be escaped.
        self.assertTrue(escaped.startswith('\\\\write18'))
        self.assertIn('\\{', escaped)
        self.assertIn('\\}', escaped)

    def test_file_uri_does_not_introduce_tex_input(self):
        from latex_builder import escape_latex

        escaped = escape_latex('file:///etc/passwd')
        self.assertNotIn('\\input', escaped.replace('\\\\', ''))


class SkillCategoryTests(unittest.TestCase):
    def test_string_skills_are_accepted(self):
        from skill_categories import group_skills_by_category

        grouped = group_skills_by_category(['Node', 'MongoDB', {'name': 'React'}])
        names = [s['name'] for cat in grouped for s in cat['skills']]
        self.assertIn('Node', names)
        self.assertIn('MongoDB', names)
        self.assertIn('React', names)


class StartupGuardTests(unittest.TestCase):
    def test_non_loopback_without_secret_refuses_start(self):
        import main as pdf_main

        previous_host = pdf_main.SERVICE_HOST
        previous_secret = pdf_main.PDF_SERVICE_SECRET
        try:
            pdf_main.SERVICE_HOST = '0.0.0.0'
            pdf_main.PDF_SERVICE_SECRET = ''
            with self.assertRaises(SystemExit):
                pdf_main.assert_secure_startup()
        finally:
            pdf_main.SERVICE_HOST = previous_host
            pdf_main.PDF_SERVICE_SECRET = previous_secret


class PdfServiceAuthHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.port = _free_port()
        os.environ['PDF_SERVICE_HOST'] = '127.0.0.1'
        os.environ['PDF_SERVICE_PORT'] = str(cls.port)
        os.environ['PDF_SERVICE_SECRET'] = 'phase6c-test-secret-value'
        # Reload module with test env.
        if 'main' in sys.modules:
            del sys.modules['main']
        import main as pdf_main

        cls.pdf_main = pdf_main
        # Avoid warmup compiling during tests.
        pdf_main.warmup_engine = lambda: None
        cls.server = pdf_main.ThreadingHTTPServer(
            ('127.0.0.1', cls.port),
            pdf_main.PdfServiceHandler,
        )
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.05)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def _request(self, method, path, body=None, headers=None):
        payload = None if body is None else json.dumps(body).encode('utf-8')
        hdrs = {'Content-Type': 'application/json'}
        if headers:
            hdrs.update(headers)
        if payload is not None:
            hdrs['Content-Length'] = str(len(payload))

        last_error = None
        for _ in range(3):
            conn = HTTPConnection('127.0.0.1', self.port, timeout=5)
            try:
                conn.request(method, path, body=payload, headers=hdrs)
                response = conn.getresponse()
                data = response.read()
                status = response.status
                return status, data
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError, OSError) as error:
                last_error = error
                time.sleep(0.05)
            finally:
                try:
                    conn.close()
                except Exception:
                    pass
        raise last_error

    def test_no_secret_rejected(self):
        status, _ = self._request(
            'POST',
            '/render',
            {'ats': {'name': 'Ada', 'summary': 'x', 'skills': []}},
        )
        self.assertEqual(status, 401)

    def test_wrong_secret_rejected(self):
        status, _ = self._request(
            'POST',
            '/render',
            {'ats': {'name': 'Ada', 'summary': 'x', 'skills': []}},
            headers={'X-PDF-Service-Secret': 'wrong'},
        )
        self.assertEqual(status, 401)

    def test_empty_secret_header_rejected(self):
        status, _ = self._request(
            'POST',
            '/render',
            {'ats': {'name': 'Ada', 'summary': 'x', 'skills': []}},
            headers={'X-PDF-Service-Secret': ''},
        )
        self.assertEqual(status, 401)

    def test_url_payload_rejected(self):
        status, body = self._request(
            'POST',
            '/render',
            {'url': 'http://127.0.0.1:9', 'ats': {'name': 'Ada', 'summary': 'x'}},
            headers={'X-PDF-Service-Secret': 'phase6c-test-secret-value'},
        )
        self.assertEqual(status, 400)
        self.assertIn(b'Unsupported', body)

    def test_html_payload_rejected(self):
        status, _ = self._request(
            'POST',
            '/render',
            {'html': '<script>alert(1)</script>', 'ats': {'name': 'Ada', 'summary': 'x'}},
            headers={'X-PDF-Service-Secret': 'phase6c-test-secret-value'},
        )
        self.assertEqual(status, 400)

    def test_oversized_body_rejected(self):
        huge = {'ats': {'name': 'Ada', 'summary': 'x' * (600 * 1024), 'skills': []}}
        status, _ = self._request(
            'POST',
            '/render',
            huge,
            headers={'X-PDF-Service-Secret': 'phase6c-test-secret-value'},
        )
        self.assertEqual(status, 413)

    def test_health_omits_filesystem_path(self):
        status, data = self._request('GET', '/health')
        self.assertIn(status, (200, 503))
        payload = json.loads(data.decode('utf-8'))
        self.assertNotIn('path', payload)


class CachePruneTests(unittest.TestCase):
    def test_prune_removes_overflow(self):
        import pdf_cache

        with tempfile.TemporaryDirectory() as tmp:
            previous_dir = pdf_cache.CACHE_DIR
            previous_max = pdf_cache.MAX_CACHE_FILES
            try:
                pdf_cache.CACHE_DIR = Path(tmp)
                pdf_cache.MAX_CACHE_FILES = 2
                for i in range(4):
                    path = pdf_cache.CACHE_DIR / f'{i}.pdf'
                    path.write_bytes(b'%PDF-1.4 test')
                pdf_cache.prune_cache()
                remaining = list(pdf_cache.CACHE_DIR.glob('*.pdf'))
                self.assertEqual(len(remaining), 2)
            finally:
                pdf_cache.CACHE_DIR = previous_dir
                pdf_cache.MAX_CACHE_FILES = previous_max


if __name__ == '__main__':
    unittest.main()
