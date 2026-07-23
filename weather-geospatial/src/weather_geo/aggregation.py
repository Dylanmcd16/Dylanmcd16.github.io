"""Point-to-grid spatial aggregation.

Binning scattered point observations (lightning flashes, reports) into a regular
grid is the core of satellite/lightning density products. Pure NumPy so it has
no heavy dependency; the caller attaches CRS/geometry when publishing.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def bin_points_to_grid(
    lons,
    lats,
    bounds: tuple[float, float, float, float],
    cell_size: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Count points per grid cell over ``bounds`` at ``cell_size`` resolution.

    Returns ``(counts, x_edges, y_edges)`` where ``counts`` is a 2-D array
    indexed ``[row (y), col (x)]`` with north-up orientation. Points outside the
    bounds are ignored (and can be counted by the caller via input length).
    """
    minx, miny, maxx, maxy = bounds
    x_edges = np.arange(minx, maxx + cell_size, cell_size)
    y_edges = np.arange(miny, maxy + cell_size, cell_size)

    lons = np.asarray(lons, dtype="float64")
    lats = np.asarray(lats, dtype="float64")
    valid = np.isfinite(lons) & np.isfinite(lats)

    counts, _, _ = np.histogram2d(lons[valid], lats[valid], bins=[x_edges, y_edges])
    # histogram2d returns [x, y]; transpose to [y, x] and flip to north-up.
    counts = counts.T[::-1, :]
    return counts.astype("int64"), x_edges, y_edges


def grid_to_dataarray(counts: np.ndarray, x_edges: np.ndarray, y_edges: np.ndarray, name: str):
    """Wrap a binned grid as a CRS-aware xarray DataArray (cell centres)."""
    import rioxarray  # noqa: F401
    import xarray as xr

    xc = (x_edges[:-1] + x_edges[1:]) / 2
    yc = (y_edges[:-1] + y_edges[1:]) / 2
    da = xr.DataArray(
        counts,
        coords={"y": yc[::-1], "x": xc},
        dims=("y", "x"),
        name=name,
        attrs={"long_name": name, "units": "count"},
    )
    da.rio.write_crs("EPSG:4326", inplace=True)
    return da


def summarize_grid(counts: np.ndarray) -> dict:
    """Basic diagnostics for a binned density grid."""
    return {
        "n_cells": int(counts.size),
        "n_nonzero_cells": int((counts > 0).sum()),
        "total_points_binned": int(counts.sum()),
        "max_per_cell": int(counts.max()) if counts.size else 0,
    }


def points_dataframe_to_grid(
    df: pd.DataFrame, bounds, cell_size, lon_col="longitude", lat_col="latitude"
):
    """Convenience wrapper: bin a points DataFrame into a density grid."""
    return bin_points_to_grid(df[lon_col], df[lat_col], bounds, cell_size)
