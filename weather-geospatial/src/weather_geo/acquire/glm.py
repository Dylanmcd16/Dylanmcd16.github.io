"""Live GOES-GLM lightning from NOAA's public S3 bucket.

Source: s3://noaa-goes19/GLM-L2-LCFA/{YYYY}/{DOY}/{HH}/OR_GLM-L2-LCFA_G19_s...nc

Each granule covers ~20 s of flashes. This module discovers the granules that
fall in a time window, reads flash lon/lat/energy from each, and returns a
combined DataFrame in the schema consumed by the aggregation workflow:
``longitude, latitude, energy_j, source_file``. Granules that fail to open
(partial/corrupt downloads) are skipped and reported, matching the workflow's
defensive-discovery emphasis.

GOES-19 is the operational GOES-East (CONUS) satellite as of 2025.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pandas as pd

from .http import CACHE_DIR, s3_filesystem

SATELLITE = "noaa-goes19"
PRODUCT = "GLM-L2-LCFA"


def _granule_start(name: str) -> datetime | None:
    # OR_GLM-L2-LCFA_G19_sYYYYDOYHHMMSSt_e..._c....nc
    try:
        s = name.split("_s")[1][:14]  # YYYYDOYHHMMSSt (tenths at end)
        year, doy = int(s[:4]), int(s[4:7])
        hh, mm, ss = int(s[7:9]), int(s[9:11]), int(s[11:13])
        base = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=doy - 1)
        return base.replace(hour=hh, minute=mm, second=ss)
    except Exception:
        return None


def discover(window_start: datetime, window_end: datetime) -> list[str]:
    """List GLM granule keys whose start time falls within the window."""
    fs = s3_filesystem()
    keys: list[str] = []
    hour = window_start.replace(minute=0, second=0, microsecond=0)
    while hour <= window_end:
        doy = hour.timetuple().tm_yday
        prefix = f"{SATELLITE}/{PRODUCT}/{hour.year}/{doy:03d}/{hour.hour:02d}/"
        try:
            for k in fs.ls(prefix):
                t = _granule_start(k.split("/")[-1])
                if t and window_start <= t <= window_end:
                    keys.append(k)
        except FileNotFoundError:
            pass
        hour += timedelta(hours=1)
    return sorted(keys)


def fetch_flashes(
    window_start: datetime,
    window_end: datetime,
    use_cache: bool = True,
) -> tuple[pd.DataFrame, list[str]]:
    """Fetch flashes for a time window. Returns (flashes_df, skipped_granules)."""
    import xarray as xr

    fs = s3_filesystem()
    keys = discover(window_start, window_end)
    frames, skipped = [], []
    for key in keys:
        name = key.split("/")[-1]
        local = CACHE_DIR / name
        try:
            if not (use_cache and local.exists() and local.stat().st_size > 0):
                CACHE_DIR.mkdir(parents=True, exist_ok=True)
                fs.get(key, str(local))
            ds = xr.open_dataset(local)
            if "number_of_flashes" not in ds.sizes or ds.sizes["number_of_flashes"] == 0:
                ds.close()
                continue
            frames.append(
                pd.DataFrame(
                    {
                        "longitude": ds["flash_lon"].values,
                        "latitude": ds["flash_lat"].values,
                        "energy_j": ds["flash_energy"].values,
                        "source_file": name,
                    }
                )
            )
            ds.close()
        except Exception:  # noqa: BLE001 - a bad granule must not sink the run
            skipped.append(name)
    flashes = (
        pd.concat(frames, ignore_index=True)
        if frames
        else pd.DataFrame(columns=["longitude", "latitude", "energy_j", "source_file"])
    )
    return flashes, skipped


def fetch_recent(minutes: int = 10, hours_back: int = 4, use_cache: bool = True):
    """Fetch a recent ``minutes``-long window (a few hours back for availability)."""
    end = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    start = end - timedelta(minutes=minutes)
    df, skipped = fetch_flashes(start, end, use_cache=use_cache)
    return start, end, df, skipped
