"""HRRR model fields from a single fixed cycle (noaa-hrrr-bdp-pds).

Downloads only the needed GRIB2 messages via HTTP byte ranges (parsed from the
.idx sidecar), reprojects each field from the native Lambert-Conformal grid onto
the Iowa display grid, and renders one raster per (variable, forecast hour).
"""

from __future__ import annotations

import math
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import rasterio
import requests

from .config import Config, parse_utc
from .domain import apply_mask, iowa_mask
from .grid import COLORMAPS, GRID_H, GRID_W, colorize, reproject_to_domain, save_rgba_webp

BASE = "https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.{ymd}/conus/hrrr.t{hh}z.wrfsfcf{ff:02d}.grib2"

# variable -> substring(s) to match in the .idx file.
SEARCH = {
    "composite_reflectivity": [":REFC:entire atmosphere:"],
    "wind_gust": [":GUST:surface:"],
    "temperature_2m": [":TMP:2 m above ground:"],
    "dewpoint_2m": [":DPT:2 m above ground:"],
    "wind_speed_10m": [":UGRD:10 m above ground:", ":VGRD:10 m above ground:"],
    "mucape": [":CAPE:180-0 mb above ground:"],
}

MS_TO_MPH = 2.23694


@dataclass
class RasterRef:
    url: str
    valid_time: datetime
    source_time: datetime | None
    available: bool


@dataclass
class HrrrHour:
    forecast_hour: int
    valid_time: datetime
    variables: dict[str, RasterRef] = field(default_factory=dict)


def _idx_ranges(idx_text: str) -> list[tuple[int, str]]:
    entries = []
    for line in idx_text.splitlines():
        parts = line.split(":")
        if len(parts) < 3:
            continue
        entries.append((int(parts[1]), line))
    return entries


def _byte_range(entries: list[tuple[int, str]], substring: str) -> tuple[int, int | None] | None:
    for i, (start, line) in enumerate(entries):
        if substring in line:
            end = entries[i + 1][0] - 1 if i + 1 < len(entries) else None
            return start, end
    return None


def _fetch_message(url: str, start: int, end: int | None) -> bytes:
    rng = f"bytes={start}-{'' if end is None else end}"
    resp = requests.get(url, headers={"Range": rng}, timeout=90)
    resp.raise_for_status()
    return resp.content


def _read_grib(raw: bytes) -> tuple[np.ndarray, object, object]:
    with tempfile.NamedTemporaryFile(suffix=".grib2", delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    try:
        # GRIB_NORMALIZE_UNITS=NO keeps native GRIB units (K, m/s, J/kg) so the
        # unit conversions below are predictable; otherwise GDAL silently maps K->C.
        with rasterio.Env(GRIB_NORMALIZE_UNITS="NO"):
            with rasterio.open(tmp_path) as ds:
                data = ds.read(1).astype(np.float32)
                nodata = ds.nodata
                if nodata is not None:
                    data = np.where(data == nodata, np.nan, data)
                return data, ds.crs, ds.transform
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _convert_units(variable: str, values: np.ndarray) -> np.ndarray:
    if variable in ("temperature_2m", "dewpoint_2m"):
        return (values - 273.15) * 9.0 / 5.0 + 32.0
    if variable in ("wind_gust", "wind_speed_10m"):
        return values * MS_TO_MPH
    return values  # reflectivity (dBZ), CAPE (J/kg)


def process(config: Config, output_dir: Path, rel_prefix: str) -> list[HrrrHour]:
    domain = config.domain
    cycle = parse_utc(config.get("hrrr", "cycle"))
    variables = config.get("hrrr", "variables", default=list(SEARCH))
    ymd = cycle.strftime("%Y%m%d")
    hh = cycle.strftime("%H")

    mask = iowa_mask(config, domain, GRID_W, GRID_H)
    forecast_hours = sorted(
        {max(0, math.floor((ft - cycle).total_seconds() / 3600)) for ft in config.frame_times}
    )

    hours: list[HrrrHour] = []
    for ff in forecast_hours:
        url = BASE.format(ymd=ymd, hh=hh, ff=ff)
        idx_text = requests.get(url + ".idx", timeout=60).text
        entries = _idx_ranges(idx_text)
        valid = cycle + timedelta(hours=ff)
        hour = HrrrHour(forecast_hour=ff, valid_time=valid)

        for variable in variables:
            arrays = []
            ok = True
            for substring in SEARCH[variable]:
                rng = _byte_range(entries, substring)
                if rng is None:
                    ok = False
                    break
                data, crs, transform = _read_grib(_fetch_message(url, rng[0], rng[1]))
                arrays.append((data, crs, transform))
            if not ok or not arrays:
                continue

            if variable == "wind_speed_10m":
                u, crs, transform = arrays[0]
                v = arrays[1][0]
                native = np.hypot(u, v)
            else:
                native, crs, transform = arrays[0]

            field_vals = _convert_units(variable, native)
            grid_vals = reproject_to_domain(field_vals, crs, transform, domain)
            floor = 5.0 if variable == "composite_reflectivity" else None
            alpha = 210 if variable != "composite_reflectivity" else 235
            rgba = apply_mask(colorize(grid_vals, COLORMAPS[variable], alpha=alpha, floor=floor), mask)

            rel_url = f"{rel_prefix}/{variable}_f{ff:02d}.webp"
            save_rgba_webp(rgba, output_dir / f"{variable}_f{ff:02d}.webp")
            hour.variables[variable] = RasterRef(
                url=rel_url, valid_time=valid, source_time=valid, available=True
            )
        hours.append(hour)
    return hours
