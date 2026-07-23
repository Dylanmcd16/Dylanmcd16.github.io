"""Gridded NWP model helpers (HRRR-style): derived fields and point sampling.

Optional dependency: xarray/rioxarray (the ``raster`` extra). The
``synthetic_wind_field`` helper lets the HRRR example run offline with a small,
deterministic U/V grid instead of downloading a multi-gigabyte forecast.

These are *model* fields. Sampling a grid at a station gives the model's value
there, not an observation — the HRRR example is careful to label the difference.
"""

from __future__ import annotations

import numpy as np

from .units import wind_speed_from_components


def synthetic_wind_field(
    bounds: tuple[float, float, float, float] = (-96.6, 40.4, -90.1, 43.5),
    resolution: float = 0.03,
    seed: int = 20250620,
):
    """A small, reproducible 10 m wind field (U and V components) over an AOI.

    Returns an ``xarray.Dataset`` with ``u10``/``v10`` variables (m/s) on a
    lon/lat grid, mimicking a subset of HRRR surface winds with a low-level jet
    streak running across the domain.
    """
    import rioxarray  # noqa: F401  (registers the .rio accessor)
    import xarray as xr

    minx, miny, maxx, maxy = bounds
    xs = np.arange(minx, maxx, resolution)
    ys = np.arange(maxy, miny, -resolution)  # north-up
    gx, gy = np.meshgrid(xs, ys)
    rng = np.random.default_rng(seed)

    # A south-southwesterly flow (a few m/s) with a weak embedded jet streak,
    # scaled to be comparable to light-to-moderate surface obs.
    yn = (gy - miny) / (maxy - miny)
    streak = 3.5 * np.exp(-(((gx - (minx + 0.55 * (maxx - minx))) / 1.4) ** 2))
    u = (2.5 + streak * 0.5 + rng.normal(0, 0.5, gx.shape)).astype("float32")
    v = (3.5 + 2.5 * yn + rng.normal(0, 0.5, gx.shape)).astype("float32")

    ds = xr.Dataset(
        {
            "u10": (("y", "x"), u, {"units": "m s-1", "long_name": "10 m U wind (synthetic)"}),
            "v10": (("y", "x"), v, {"units": "m s-1", "long_name": "10 m V wind (synthetic)"}),
        },
        coords={"y": ys, "x": xs},
    )
    ds.rio.write_crs("EPSG:4326", inplace=True)
    return ds


def derive_wind_speed(ds, u_var: str = "u10", v_var: str = "v10"):
    """Add a scalar ``wind_speed`` variable (m/s) derived from U and V."""
    speed = wind_speed_from_components(ds[u_var], ds[v_var])
    speed.attrs = {"units": "m s-1", "long_name": "10 m wind speed (derived)"}
    return ds.assign(wind_speed=speed)


def sample_at_points(da, lons, lats):
    """Sample a 2-D DataArray at lon/lat points using nearest-neighbour.

    Returns a numpy array of values aligned with the input points. Points off
    the grid yield NaN rather than raising, so callers handle out-of-domain
    stations explicitly.
    """
    import xarray as xr

    xi = xr.DataArray(np.asarray(lons), dims="points")
    yi = xr.DataArray(np.asarray(lats), dims="points")
    sampled = da.sel(x=xi, y=yi, method="nearest")
    return np.asarray(sampled.values, dtype="float64")
