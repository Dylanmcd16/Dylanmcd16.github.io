"""Shared rasterization: the Iowa display grid, colormaps, and WebP output."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from rasterio.crs import CRS
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject

from .config import Domain

# Target pixel grid for reprojected (model/satellite) rasters.
GRID_W = 1000
GRID_H = 500

WGS84 = CRS.from_epsg(4326)


def domain_transform(domain: Domain, width: int, height: int):
    return from_bounds(domain.lon_min, domain.lat_min, domain.lon_max, domain.lat_max, width, height)


# ---- Colormaps ------------------------------------------------------------
# Each colormap is a list of (value, (r, g, b)) stops; values below the first
# stop are transparent.

ColorStops = list[tuple[float, tuple[int, int, int]]]

REFLECTIVITY: ColorStops = [
    (5, (4, 233, 231)),
    (20, (1, 159, 244)),
    (30, (3, 0, 244)),
    (35, (2, 253, 2)),
    (40, (1, 197, 1)),
    (45, (0, 142, 0)),
    (50, (253, 248, 2)),
    (55, (229, 188, 0)),
    (60, (253, 149, 0)),
    (65, (253, 0, 0)),
    (70, (212, 0, 0)),
    (75, (188, 0, 0)),
    (80, (248, 0, 253)),
]

TEMPERATURE_F: ColorStops = [
    (30, (68, 1, 84)),
    (45, (59, 82, 139)),
    (60, (33, 145, 140)),
    (70, (94, 201, 98)),
    (80, (253, 231, 37)),
    (90, (240, 130, 40)),
    (100, (200, 30, 30)),
]

DEWPOINT_F: ColorStops = [
    (30, (215, 205, 180)),
    (45, (150, 190, 120)),
    (55, (70, 160, 110)),
    (65, (30, 120, 90)),
    (72, (20, 90, 90)),
    (80, (15, 60, 80)),
]

WIND_MPH: ColorStops = [
    (0, (230, 230, 235)),
    (20, (250, 210, 90)),
    (40, (245, 130, 40)),
    (60, (220, 40, 40)),
    (80, (150, 30, 120)),
    (110, (90, 10, 90)),
]

CAPE: ColorStops = [
    (250, (235, 245, 255)),
    (1000, (120, 200, 250)),
    (2000, (90, 200, 120)),
    (3000, (250, 220, 70)),
    (4000, (245, 130, 40)),
    (5000, (210, 40, 40)),
]

# Infrared brightness temperature (deg C): warm low clouds pale, cold tops vivid.
IR_TEMPC: ColorStops = [
    (-90, (255, 0, 255)),
    (-80, (255, 0, 0)),
    (-70, (255, 170, 0)),
    (-60, (255, 255, 0)),
    (-50, (0, 180, 0)),
    (-40, (0, 120, 220)),
    (-30, (40, 40, 40)),
    (20, (235, 235, 235)),
]

COLORMAPS: dict[str, ColorStops] = {
    "composite_reflectivity": REFLECTIVITY,
    "wind_gust": WIND_MPH,
    "wind_speed_10m": WIND_MPH,
    "temperature_2m": TEMPERATURE_F,
    "dewpoint_2m": DEWPOINT_F,
    "mucape": CAPE,
    "infrared": IR_TEMPC,
}


def colorize(values: np.ndarray, stops: ColorStops, alpha: int = 220, floor: float | None = None) -> np.ndarray:
    """Map a 2D float array (NaN = transparent) to an HxWx4 uint8 RGBA image."""
    h, w = values.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    vs = np.array([s[0] for s in stops], dtype=np.float32)
    cols = np.array([s[1] for s in stops], dtype=np.float32)

    valid = np.isfinite(values)
    if floor is not None:
        valid &= values >= floor
    else:
        valid &= values >= vs[0]

    v = np.clip(values, vs[0], vs[-1])
    for c in range(3):
        rgba[..., c] = np.interp(v, vs, cols[:, c]).astype(np.uint8)
    rgba[..., 3] = np.where(valid, alpha, 0).astype(np.uint8)
    rgba[~valid] = 0
    return rgba


def grayscale(values: np.ndarray, alpha: int = 235) -> np.ndarray:
    """0-1 reflectance to opaque grayscale RGBA (visible satellite)."""
    h, w = values.shape
    v = np.clip(values, 0, 1)
    g = (np.sqrt(v) * 255).astype(np.uint8)  # gamma lift for visibility
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    for c in range(3):
        rgba[..., c] = g
    rgba[..., 3] = np.where(np.isfinite(values), alpha, 0).astype(np.uint8)
    return rgba


def save_rgba_webp(rgba: np.ndarray, path: Path, quality: int = 90) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(path, "WEBP", quality=quality)


def reproject_to_domain(
    src: np.ndarray,
    src_crs: CRS,
    src_transform,
    domain: Domain,
    width: int = GRID_W,
    height: int = GRID_H,
    src_nodata: float | None = None,
    resampling: Resampling = Resampling.bilinear,
) -> np.ndarray:
    """Reproject a single-band source array onto the Iowa lon/lat display grid."""
    dst = np.full((height, width), np.nan, dtype=np.float32)
    reproject(
        source=src.astype(np.float32),
        destination=dst,
        src_transform=src_transform,
        src_crs=src_crs,
        src_nodata=src_nodata,
        dst_transform=domain_transform(domain, width, height),
        dst_crs=WGS84,
        dst_nodata=np.nan,
        resampling=resampling,
    )
    return dst
