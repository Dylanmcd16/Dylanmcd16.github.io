"""Cached HTTP + S3 helpers shared by the live-data fetchers.

Downloads are cached under a local ``data-cache/`` directory (git-ignored) so a
second run of a live workflow does not re-hit the network, and so a flaky
endpoint does not break a demo mid-presentation. All network access lives here
and in the per-source modules; nothing else in the package touches the network.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Repo-local cache: <repo>/weather-geospatial/data-cache/
CACHE_DIR = Path(__file__).resolve().parents[3] / "data-cache"
USER_AGENT = "weather-geo-examples (github.com/Dylanmcd16; contact via repo)"
DEFAULT_TIMEOUT = 60


def _build_session() -> requests.Session:
    """A session that retries transient errors (429/5xx) with backoff.

    Public data endpoints (IEM, NCEI, SPC) return occasional 503s under load; a
    few backed-off retries turn those transients into successful fetches.
    """
    session = requests.Session()
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({"User-Agent": USER_AGENT})
    return session


SESSION = _build_session()


def cache_path(key: str, suffix: str = "") -> Path:
    """Deterministic cache file path for an arbitrary key (usually a URL)."""
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{digest}{suffix}"


def get_text(url: str, use_cache: bool = True, timeout: int = DEFAULT_TIMEOUT) -> str:
    """GET a text resource, caching the body on disk."""
    cp = cache_path(url, ".txt")
    if use_cache and cp.exists():
        return cp.read_text(encoding="utf-8", errors="replace")
    resp = SESSION.get(url, timeout=timeout)
    resp.raise_for_status()
    cp.write_text(resp.text, encoding="utf-8")
    return resp.text


def get_bytes(url: str, use_cache: bool = True, timeout: int = DEFAULT_TIMEOUT) -> bytes:
    """GET a binary resource, caching it on disk."""
    cp = cache_path(url, ".bin")
    if use_cache and cp.exists():
        return cp.read_bytes()
    resp = SESSION.get(url, timeout=timeout)
    resp.raise_for_status()
    cp.write_bytes(resp.content)
    return resp.content


def get_range(url: str, start: int, end: int, timeout: int = DEFAULT_TIMEOUT) -> bytes:
    """HTTP Range GET (used to pull single GRIB2 messages via a .idx index)."""
    resp = SESSION.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=timeout)
    resp.raise_for_status()
    return resp.content


def download_to(
    url: str, dest: Path, use_cache: bool = True, timeout: int = DEFAULT_TIMEOUT
) -> Path:
    """Download a URL to a specific path (cached)."""
    dest = Path(dest)
    if use_cache and dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    resp = SESSION.get(url, timeout=timeout, stream=True)
    resp.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1 << 16):
            f.write(chunk)
    return dest


def s3_filesystem():
    """Anonymous S3 filesystem for public NOAA buckets (requires s3fs)."""
    import s3fs

    return s3fs.S3FileSystem(anon=True)
