"""GOES-16 ABI imagery from the L2 Cloud & Moisture product (noaa-goes16).

For each processed frame, produces three co-registered Iowa rasters:
  - visible  (Band 2, 0.64 um reflectance) as grayscale
  - infrared (Band 13, 10.3 um brightness temperature) as a color IR enhancement
  - sandwich (visible detail with cold IR tops colorized on top)
"""

from __future__ import annotations

import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3
import numpy as np
import xarray as xr
from affine import Affine
from botocore import UNSIGNED
from botocore.config import Config as BotoConfig
from rasterio.crs import CRS

from .config import Config
from .domain import apply_mask, iowa_mask
from .grid import COLORMAPS, GRID_H, GRID_W, colorize, grayscale, reproject_to_domain, save_rgba_webp

BUCKET = "noaa-goes16"


@dataclass
class SatelliteRef:
    url: str
    valid_time: datetime
    source_time: datetime
    available: bool
    products: dict[str, str] = field(default_factory=dict)


def _client():
    return boto3.client("s3", region_name="us-east-1", config=BotoConfig(signature_version=UNSIGNED))


def _start_time(key: str) -> datetime:
    # ..._sYYYYDOYHHMMSSm_...  (scan start)
    token = next(part for part in key.split("_") if part.startswith("s") and part[1:].isdigit())
    stamp = token[1:]
    year = int(stamp[0:4])
    doy = int(stamp[4:7])
    hour = int(stamp[7:9])
    minute = int(stamp[9:11])
    second = int(stamp[11:13])
    base = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=doy - 1)
    return base.replace(hour=hour, minute=minute, second=second)


def _list_hour(s3, product: str, when: datetime) -> list[str]:
    doy = when.timetuple().tm_yday
    prefix = f"{product}/{when:%Y}/{doy:03d}/{when:%H}/"
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix)
    return [o["Key"] for o in resp.get("Contents", [])]


def _nearest_key(s3, product: str, target: datetime, tolerance: timedelta) -> tuple[str, datetime] | None:
    candidates = _list_hour(s3, product, target)
    # Include the neighbouring hour if the target is near an edge.
    candidates += _list_hour(s3, product, target - timedelta(hours=1))
    best = None
    for key in candidates:
        try:
            start = _start_time(key)
        except StopIteration:
            continue
        delta = abs(start - target)
        if delta <= tolerance and (best is None or delta < best[2]):
            best = (key, start, delta)
    if best is None:
        return None
    return best[0], best[1]


def _projection(ds: xr.Dataset) -> tuple[CRS, Affine]:
    p = ds["goes_imager_projection"]
    h = float(p.perspective_point_height)
    lon0 = float(p.longitude_of_projection_origin)
    sweep = str(p.sweep_angle_axis)
    a = float(p.semi_major_axis)
    b = float(p.semi_minor_axis)
    x = ds.x.values * h
    y = ds.y.values * h
    dx = float(x[1] - x[0])
    dy = float(y[1] - y[0])
    transform = Affine.translation(x[0] - dx / 2, y[0] - dy / 2) * Affine.scale(dx, dy)
    crs = CRS.from_proj4(f"+proj=geos +h={h} +lon_0={lon0} +sweep={sweep} +a={a} +b={b} +units=m +no_defs")
    return crs, transform


def _sandwich(vis: np.ndarray, ir_c: np.ndarray) -> np.ndarray:
    """Visible grayscale base with cold IR tops colorized on top."""
    base = grayscale(vis, alpha=255).astype(np.float32)
    ir_color = colorize(ir_c, COLORMAPS["infrared"], alpha=255, floor=None).astype(np.float32)
    # IR opacity ramps in for cloud tops colder than -30C, full by -60C.
    a = np.clip((-30.0 - ir_c) / 30.0, 0.0, 1.0)
    a = np.where(np.isfinite(ir_c), a, 0.0)[..., None]
    out = base.copy()
    out[..., :3] = base[..., :3] * (1 - a) + ir_color[..., :3] * a
    out[..., 3] = np.where(np.isfinite(vis), 255, 0)
    return out.astype(np.uint8)


def process(config: Config, output_dir: Path, rel_prefix: str) -> list[SatelliteRef | None]:
    product = config.get("satellite", "product", default="ABI-L2-MCMIPC")
    every_n = int(config.get("satellite", "every_n_frames", default=3))
    tol = timedelta(minutes=int(config.get("satellite", "tolerance_minutes", default=8)))
    bands = config.get("satellite", "bands", default={"visible": 2, "infrared": 13})
    domain = config.domain
    mask = iowa_mask(config, domain, GRID_W, GRID_H)
    s3 = _client()

    refs: list[SatelliteRef | None] = []
    for index, frame_time in enumerate(config.frame_times):
        if index % every_n != 0:
            refs.append(None)
            continue
        found = _nearest_key(s3, product, frame_time, tol)
        if found is None:
            refs.append(None)
            continue
        key, start = found

        with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            s3.download_file(BUCKET, key, tmp_path)
            ds = xr.open_dataset(tmp_path)
            crs, transform = _projection(ds)
            vis_native = ds[f"CMI_C{int(bands['visible']):02d}"].values
            ir_native = ds[f"CMI_C{int(bands['infrared']):02d}"].values - 273.15
            ds.close()
        finally:
            Path(tmp_path).unlink(missing_ok=True)

        vis = reproject_to_domain(vis_native, crs, transform, domain)
        ir_c = reproject_to_domain(ir_native, crs, transform, domain)

        products = {
            "visible": f"{rel_prefix}/visible_{index:02d}.webp",
            "infrared": f"{rel_prefix}/infrared_{index:02d}.webp",
            "sandwich": f"{rel_prefix}/sandwich_{index:02d}.webp",
        }
        save_rgba_webp(apply_mask(grayscale(vis, alpha=255), mask), output_dir / f"visible_{index:02d}.webp")
        save_rgba_webp(apply_mask(colorize(ir_c, COLORMAPS["infrared"], alpha=255, floor=None), mask), output_dir / f"infrared_{index:02d}.webp")
        save_rgba_webp(apply_mask(_sandwich(vis, ir_c), mask), output_dir / f"sandwich_{index:02d}.webp")

        refs.append(
            SatelliteRef(
                url=products["sandwich"],
                valid_time=frame_time,
                source_time=start,
                available=True,
                products=products,
            )
        )
    return refs
