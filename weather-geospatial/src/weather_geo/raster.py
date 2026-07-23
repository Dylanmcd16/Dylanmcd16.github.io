"""Raster metadata, clipping, reprojection, and zonal statistics.

Optional dependency: rioxarray/rasterio/xarray (install the ``raster`` extra).
Imports are deferred so this module can be imported for its docstring/API
without the raster stack present.

The ``synthetic_precip_grid`` helper lets the MRMS example run offline with a
small, deterministic grid instead of downloading a multi-megabyte GRIB2 file.
"""

from __future__ import annotations

import numpy as np


def synthetic_precip_grid(
    bounds: tuple[float, float, float, float] = (-96.6, 40.4, -90.1, 43.5),
    resolution: float = 0.02,
    seed: int = 20250620,
):
    """A small, reproducible precipitation raster over an AOI (default: Iowa).

    Returns an ``xarray.DataArray`` with a CRS and affine transform so the rest
    of the raster workflow behaves exactly as it would on a real MRMS grid.
    A smooth Gaussian "storm" is placed off-centre to make zonal statistics
    meaningful.
    """
    import rioxarray  # noqa: F401  (registers the .rio accessor)
    import xarray as xr

    minx, miny, maxx, maxy = bounds
    xs = np.arange(minx, maxx, resolution)
    ys = np.arange(maxy, miny, -resolution)  # north-up
    gx, gy = np.meshgrid(xs, ys)

    cx, cy = minx + 0.6 * (maxx - minx), miny + 0.55 * (maxy - miny)
    dist2 = (gx - cx) ** 2 + (gy - cy) ** 2
    rng = np.random.default_rng(seed)
    field = 90.0 * np.exp(-dist2 / 0.35) + rng.normal(0, 1.5, size=gx.shape)
    field = np.clip(field, 0, None).astype("float32")

    da = xr.DataArray(
        field,
        coords={"y": ys, "x": xs},
        dims=("y", "x"),
        name="precip_mm",
        attrs={"units": "mm", "long_name": "storm-total precipitation (synthetic)"},
    )
    da.rio.write_crs("EPSG:4326", inplace=True)
    da.rio.write_nodata(np.nan, inplace=True)
    return da


def raster_metadata(da) -> dict:
    """Extract the metadata that matters for correct downstream processing."""
    return {
        "variable": da.name,
        "units": da.attrs.get("units"),
        "crs": str(da.rio.crs),
        "shape": [int(s) for s in da.shape],
        "resolution": [float(v) for v in da.rio.resolution()],
        "bounds": [float(b) for b in da.rio.bounds()],
        "nodata": None if da.rio.nodata is None else float(da.rio.nodata),
        "valid_min": float(np.nanmin(da.values)),
        "valid_max": float(np.nanmax(da.values)),
    }


def clip_to_geometry(da, geometries, crs):
    """Clip a raster to vector geometries (AOI), dropping outside pixels."""
    return da.rio.clip(geometries, crs, drop=True, all_touched=True)


def reproject(da, dst_crs: str, resampling: str = "bilinear"):
    """Reproject a raster to ``dst_crs`` using the named resampling method."""
    from rasterio.enums import Resampling

    method = getattr(Resampling, resampling)
    return da.rio.reproject(dst_crs, resampling=method)


def zonal_statistics(da, zones, zone_field: str) -> object:
    """Per-zone max, mean, and exceedance area for a raster.

    Returns a pandas DataFrame with one row per polygon in ``zones``. Uses the
    raster's own CRS for the mask and reports area in the raster's units, so no
    hidden CRS assumptions leak in.
    """
    import pandas as pd

    if zones.crs is None or str(zones.crs) != str(da.rio.crs):
        zones = zones.to_crs(da.rio.crs)

    rows = []
    for _, zone in zones.iterrows():
        try:
            sub = da.rio.clip([zone.geometry], zones.crs, drop=True, all_touched=True)
            vals = sub.values[np.isfinite(sub.values)]
        except Exception:
            vals = np.array([])
        rows.append(
            {
                zone_field: zone[zone_field],
                "n_pixels": int(vals.size),
                "max": float(vals.max()) if vals.size else np.nan,
                "mean": float(vals.mean()) if vals.size else np.nan,
                "pixels_over_25mm": int((vals > 25).sum()) if vals.size else 0,
            }
        )
    return pd.DataFrame(rows)
