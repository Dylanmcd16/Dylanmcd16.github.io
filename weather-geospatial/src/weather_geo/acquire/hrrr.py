"""Live HRRR model winds from NOAA's public S3 bucket, via .idx byte-ranging.

Source: s3://noaa-hrrr-bdp-pds/hrrr.{YYYYMMDD}/conus/hrrr.t{HH}z.wrfsfcf{FF}.grib2

A full HRRR surface file is ~150 MB. Using the companion ``.idx`` index we pull
only the two messages we need — 10 m U and V wind — via HTTP Range requests
(~2 MB), then regrid that small Lambert-Conformal subset onto a regular lat/lon
mesh over the area of interest so it drops into the model workflow exactly like
the synthetic field (Dataset with 1-D ``x``/``y`` and ``u10``/``v10``).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np

from .http import CACHE_DIR, get_range, get_text, s3_filesystem

BUCKET = "noaa-hrrr-bdp-pds"
HTTP_BASE = "https://noaa-hrrr-bdp-pds.s3.amazonaws.com"


def latest_cycle(fcst_hour: int = 1, hours_back_max: int = 6) -> tuple[str, int, str]:
    """Find a recent, available HRRR cycle. Returns (YYYYMMDD, cycle_hour, key)."""
    fs = s3_filesystem()
    now = datetime.now(timezone.utc) - timedelta(hours=2)  # publication lag
    for h in range(hours_back_max):
        t = now - timedelta(hours=h)
        day, cyc = t.strftime("%Y%m%d"), t.hour
        key = f"{BUCKET}/hrrr.{day}/conus/hrrr.t{cyc:02d}z.wrfsfcf{fcst_hour:02d}.grib2"
        if fs.exists(key) and fs.exists(key + ".idx"):
            return day, cyc, key
    raise FileNotFoundError("no recent HRRR cycle found")


def _byte_ranges(idx_text: str, wanted: list[str]) -> list[tuple[str, int, int]]:
    """Parse a GRIB .idx and return (label, start, end) for each wanted message."""
    lines = [ln for ln in idx_text.splitlines() if ln.strip()]
    entries = []  # (msgnum, start, rest)
    for ln in lines:
        parts = ln.split(":")
        entries.append((int(parts[0]), int(parts[1]), ln))
    ranges = []
    for i, (_, start, ln) in enumerate(entries):
        for label in wanted:
            if label in ln:
                end = entries[i + 1][1] - 1 if i + 1 < len(entries) else ""
                ranges.append((label, start, end))
    return ranges


def fetch_wind_field(
    fcst_hour: int = 1,
    bounds: tuple[float, float, float, float] = (-96.6, 40.4, -90.1, 43.5),
    resolution: float = 0.03,
    use_cache: bool = True,
):
    """Fetch HRRR 10 m U/V for a recent cycle and regrid onto the AOI mesh."""
    import xarray as xr
    from scipy.interpolate import griddata

    day, cyc, key = latest_cycle(fcst_hour)
    rel = key.split(f"{BUCKET}/")[1]
    url = f"{HTTP_BASE}/{rel}"
    idx = get_text(url + ".idx", use_cache=use_cache)
    ranges = _byte_ranges(idx, ["UGRD:10 m above ground", "VGRD:10 m above ground"])
    if len(ranges) < 2:
        raise RuntimeError("could not locate 10 m U/V messages in HRRR .idx")

    grib_path = CACHE_DIR / f"hrrr.{day}.t{cyc:02d}z.f{fcst_hour:02d}.10mwind.grib2"
    if not (use_cache and grib_path.exists() and grib_path.stat().st_size > 0):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        blob = b"".join(get_range(url, start, end) for _, start, end in ranges)
        grib_path.write_bytes(blob)

    ds = xr.open_dataset(
        grib_path,
        engine="cfgrib",
        backend_kwargs={"indexpath": "", "filter_by_keys": {"typeOfLevel": "heightAboveGround"}},
    )
    lat = ds["latitude"].values
    lon = ds["longitude"].values
    lon = np.where(lon > 180, lon - 360, lon)
    u = ds["u10"].values
    v = ds["v10"].values

    # Regrid the (curvilinear Lambert) subset onto a regular lat/lon AOI mesh.
    minx, miny, maxx, maxy = bounds
    pad = 0.5
    m = (lon >= minx - pad) & (lon <= maxx + pad) & (lat >= miny - pad) & (lat <= maxy + pad)
    pts = np.column_stack([lon[m], lat[m]])
    xs = np.arange(minx, maxx, resolution)
    ys = np.arange(maxy, miny, -resolution)
    gx, gy = np.meshgrid(xs, ys)
    ug = griddata(pts, u[m], (gx, gy), method="linear")
    vg = griddata(pts, v[m], (gx, gy), method="linear")

    out = xr.Dataset(
        {
            "u10": (("y", "x"), ug.astype("float32"), {"units": "m s-1"}),
            "v10": (("y", "x"), vg.astype("float32"), {"units": "m s-1"}),
        },
        coords={"y": ys, "x": xs},
        attrs={"source": f"HRRR {day} t{cyc:02d}z f{fcst_hour:02d} (10 m wind, idx-subset)"},
    )
    import rioxarray  # noqa: F401

    out.rio.write_crs("EPSG:4326", inplace=True)
    return out, {"day": day, "cycle": cyc, "fcst_hour": fcst_hour, "key": key}
