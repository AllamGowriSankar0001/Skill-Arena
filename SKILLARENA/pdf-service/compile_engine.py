import os
import shutil
import subprocess
import tempfile
from pathlib import Path

PDFLATEX_BIN = os.getenv('PDFLATEX_BIN', 'pdflatex')
TECTONIC_BIN = os.getenv('TECTONIC_BIN', 'tectonic')
SERVICE_ROOT = Path(__file__).resolve().parent
BUNDLED_TECTONIC = SERVICE_ROOT / 'bin' / 'tectonic.exe'


def _windows_pdflatex_candidates() -> list[Path]:
    candidates: list[Path] = []
    program_files = [
        os.environ.get('ProgramFiles'),
        os.environ.get('ProgramFiles(x86)'),
        os.environ.get('LocalAppData'),
    ]
    for base in program_files:
        if not base:
            continue
        candidates.extend(
            [
                Path(base) / 'MiKTeX' / 'miktex' / 'bin' / 'x64' / 'pdflatex.exe',
                Path(base) / 'Programs' / 'MiKTeX' / 'miktex' / 'bin' / 'x64' / 'pdflatex.exe',
            ]
        )
    return candidates


def find_pdflatex() -> str | None:
    candidate = PDFLATEX_BIN
    if Path(candidate).exists() or shutil.which(candidate):
        return str(Path(candidate) if Path(candidate).exists() else shutil.which(candidate))

    for path in _windows_pdflatex_candidates():
        if path.exists():
            return str(path)
    return None


def find_tectonic() -> str | None:
    if BUNDLED_TECTONIC.exists():
        return str(BUNDLED_TECTONIC)

    candidate = TECTONIC_BIN
    if Path(candidate).exists():
        return str(Path(candidate))
    resolved = shutil.which(candidate)
    return resolved


def find_latex_engine() -> tuple[str, str]:
    tectonic = find_tectonic()
    if tectonic:
        return 'tectonic', tectonic

    pdflatex = find_pdflatex()
    if pdflatex:
        return 'pdflatex', pdflatex

    raise RuntimeError(
        'No LaTeX engine found. Install MiKTeX/TeX Live (pdflatex), install Tectonic, '
        'or place tectonic.exe in pdf-service/bin/. '
        'You can also set PDFLATEX_BIN or TECTONIC_BIN in the environment.',
    )


def compile_with_pdflatex(pdflatex: str, tex_source: str) -> bytes:
    with tempfile.TemporaryDirectory(prefix='skillarena-resume-') as tmpdir:
        tex_path = Path(tmpdir) / 'resume.tex'
        tex_path.write_text(tex_source, encoding='utf-8')

        # Never enable -shell-escape. Restrict write to the temp directory.
        command = [
            pdflatex,
            '-interaction=nonstopmode',
            '-halt-on-error',
            '-no-shell-escape',
            f'-output-directory={tmpdir}',
            str(tex_path),
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=90,
            cwd=tmpdir,
            env=_minimal_subprocess_env(),
        )

        pdf_path = Path(tmpdir) / 'resume.pdf'
        if result.returncode != 0 or not pdf_path.exists():
            raise RuntimeError('pdflatex compilation failed.')

        return pdf_path.read_bytes()


def compile_with_tectonic(tectonic: str, tex_source: str) -> bytes:
    with tempfile.TemporaryDirectory(prefix='skillarena-resume-') as tmpdir:
        tex_path = Path(tmpdir) / 'resume.tex'
        tex_path.write_text(tex_source, encoding='utf-8')
        pdf_path = tex_path.with_suffix('.pdf')

        # Prefer offline/cached packages to avoid outbound network from the renderer.
        command = [tectonic, '--only-cached', str(tex_path.name)]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=tmpdir,
            env=_minimal_subprocess_env(),
        )

        # If the local cache lacks packages, retry once without --only-cached
        # (still no shell-escape). Documented remaining network risk for package fetch.
        if result.returncode != 0 or not pdf_path.exists():
            command = [tectonic, str(tex_path.name)]
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=120,
                cwd=tmpdir,
                env=_minimal_subprocess_env(),
            )

        if result.returncode != 0 or not pdf_path.exists():
            raise RuntimeError('Tectonic compilation failed.')

        return pdf_path.read_bytes()


def _minimal_subprocess_env() -> dict:
    """Pass through PATH/system vars needed to find TeX; omit app secrets."""
    keep = (
        'PATH',
        'PATHEXT',
        'SystemRoot',
        'SYSTEMROOT',
        'WINDIR',
        'TEMP',
        'TMP',
        'TMPDIR',
        'HOME',
        'USERPROFILE',
        'APPDATA',
        'LOCALAPPDATA',
        'LANG',
        'LC_ALL',
        'TEXMFHOME',
        'TEXMFVAR',
        'TEXMFCACHE',
    )
    env = {key: os.environ[key] for key in keep if key in os.environ}
    # Ensure TeX cannot inherit Node/API secrets if this process was started oddly.
    for blocked in (
        'JWT_SECRET',
        'MONGODB_URI',
        'SMTP_PASS',
        'SMTP_PASSWORD',
        'PDF_SERVICE_SECRET',
        'GEMINI_API_KEY',
        'OPENAI_API_KEY',
        'AI_KEYS_SECRET',
    ):
        env.pop(blocked, None)
    return env


def compile_latex(tex_source: str) -> bytes:
    engine_name, engine_path = find_latex_engine()
    if engine_name == 'pdflatex':
        return compile_with_pdflatex(engine_path, tex_source)
    return compile_with_tectonic(engine_path, tex_source)
