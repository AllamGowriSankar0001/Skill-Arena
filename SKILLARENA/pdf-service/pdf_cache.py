import hashlib
import json
import os
from pathlib import Path
from typing import Optional

SERVICE_ROOT = Path(__file__).resolve().parent
CACHE_DIR = SERVICE_ROOT / 'cache'
MAX_CACHE_FILES = max(10, int(os.getenv('PDF_SERVICE_MAX_CACHE_FILES', '100')))


def _canonical_ats(ats: dict) -> str:
    return json.dumps(ats, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def cache_key(ats: dict) -> str:
    return hashlib.sha256(_canonical_ats(ats).encode('utf-8')).hexdigest()


def get_cached_pdf(ats: dict) -> Optional[bytes]:
    path = CACHE_DIR / f'{cache_key(ats)}.pdf'
    if path.exists():
        return path.read_bytes()
    return None


def store_cached_pdf(ats: dict, pdf_bytes: bytes) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f'{cache_key(ats)}.pdf'
    path.write_bytes(pdf_bytes)


def prune_cache() -> None:
    """Keep cache bounded (content-addressed; oldest mtime removed first)."""
    if not CACHE_DIR.exists():
        return
    files = sorted(
        (p for p in CACHE_DIR.glob('*.pdf') if p.is_file()),
        key=lambda p: p.stat().st_mtime,
    )
    overflow = len(files) - MAX_CACHE_FILES
    if overflow <= 0:
        return
    for path in files[:overflow]:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
