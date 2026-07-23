"""Point-geometry construction and spatial joins.

Optional dependency: geopandas/shapely (install the ``geo`` extra). Imports are
deferred so the pure-Python modules in this package remain importable without
the geospatial stack.
"""

from __future__ import annotations

import pandas as pd

from .projections import WGS84


def points_from_dataframe(
    df: pd.DataFrame,
    lon_col: str = "longitude",
    lat_col: str = "latitude",
    crs: str = WGS84,
):
    """Build a GeoDataFrame of point geometries from lon/lat columns.

    Rows with missing coordinates are dropped (they cannot be placed) and the
    count is available via ``df`` length comparison by the caller.
    """
    import geopandas as gpd

    valid = df.dropna(subset=[lon_col, lat_col]).copy()
    geometry = gpd.points_from_xy(valid[lon_col], valid[lat_col])
    return gpd.GeoDataFrame(valid, geometry=geometry, crs=crs)


def assign_boundary(
    points,
    boundaries,
    boundary_fields: list[str],
    how: str = "left",
):
    """Point-in-polygon join that preserves unmatched points.

    Uses a ``left`` join by default so reports that fall outside every polygon
    are kept with null boundary attributes rather than silently discarded.
    Both inputs are reprojected to a common CRS before joining to avoid the
    classic "join returns nothing" CRS-mismatch bug.
    """
    import geopandas as gpd

    if points.crs != boundaries.crs:
        boundaries = boundaries.to_crs(points.crs)
    cols = ["geometry", *boundary_fields]
    joined = gpd.sjoin(points, boundaries[cols], how=how, predicate="within")
    return joined.drop(columns=[c for c in ("index_right",) if c in joined.columns])
