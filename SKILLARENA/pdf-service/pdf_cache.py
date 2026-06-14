import hashlib
import json
from pathlib import Path
from typing import Optional

SERVICE_ROOT = Path(__file__).resolve().parent
CACHE_DIR = SERVICE_ROOT / 'cache'


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
