"""Radar reflectivity from the IEM archived national NEXRAD composite (N0Q).

Direct per-site NEXRAD Level II (noaa-nexrad-level2) is blocked for anonymous
access in some networks. IEM's N0Q product is the national base-reflectivity
mosaic on a fixed 0.005-degree EPSG:4326 grid at 5-minute cadence, which we crop
to the Iowa domain. Each frame keeps the actual composite time.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

import numpy as np
import requests
from PIL import Image

from .config import Config, Domain

# IEM uscomp N0Q georeferencing (from the product world file).
COMP_ORIGIN_LON = -126.0
COMP_ORIGIN_LAT = 50.0
COMP_RES = 0.005

N0Q_URL = "https://mesonet.agron.iastate.edu/archive/data/{y}/{m:02d}/{d:02d}/GIS/uscomp/n0q_{stamp}.png"


@dataclass
class RasterRef:
    url: str
    valid_time: datetime
    source_time: datetime | None
    available: bool


def _crop_box(domain: Domain) -> tuple[int, int, int, int]:
    left = round((domain.lon_min - COMP_ORIGIN_LON) / COMP_RES)
    right = round((domain.lon_max - COMP_ORIGIN_LON) / COMP_RES)
    top = round((COMP_ORIGIN_LAT - domain.lat_max) / COMP_RES)
    bottom = round((COMP_ORIGIN_LAT - domain.lat_min) / COMP_RES)
    return left, top, right, bottom


def _download(stamp: datetime) -> Image.Image | None:
    url = N0Q_URL.format(y=stamp.year, m=stamp.month, d=stamp.day, stamp=stamp.strftime("%Y%m%d%H%M"))
    try:
        resp = requests.get(url, timeout=60)
    except requests.RequestException:
        return None
    if resp.status_code != 200 or not resp.content:
        return None
    return Image.open(BytesIO(resp.content))


def process(config: Config, output_dir: Path, rel_prefix: str) -> list[RasterRef | None]:
    domain = config.domain
    box = _crop_box(domain)
    tolerance = int(config.get("radar", "tolerance_minutes", default=6))
    offsets = [0]
    for step in range(5, tolerance + 1, 5):
        offsets += [-step, step]

    refs: list[RasterRef | None] = []
    for index, frame_time in enumerate(config.frame_times):
        source = None
        source_time = None
        for offset in offsets:
            stamp = frame_time + timedelta(minutes=offset)
            image = _download(stamp)
            if image is not None:
                source = image
                source_time = stamp
                break

        if source is None:
            refs.append(None)
            continue

        rgba = _to_rgba(source.crop(box))
        rel_url = f"{rel_prefix}/frame-{index:02d}.webp"
        out_path = output_dir / f"frame-{index:02d}.webp"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba, "RGBA").save(out_path, "WEBP", quality=90)
        refs.append(
            RasterRef(url=rel_url, valid_time=frame_time, source_time=source_time, available=True)
        )
    return refs


def _to_rgba(cropped: Image.Image) -> np.ndarray:
    """Convert an N0Q palette crop to RGBA with no-data made transparent."""
    if cropped.mode == "P":
        rgba = np.array(cropped.convert("RGBA"))
        # N0Q palette index 0 is "no data"; force it transparent regardless of tRNS.
        idx = np.array(cropped)
        rgba[idx == 0, 3] = 0
    else:
        rgba = np.array(cropped.convert("RGBA"))
        # Fallback: treat near-black as no data.
        dark = (rgba[..., :3].max(axis=-1) < 8)
        rgba[dark, 3] = 0
    return rgba
