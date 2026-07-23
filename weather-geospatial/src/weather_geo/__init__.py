"""weather_geo — reusable utilities for meteorological geospatial pipelines.

The package is organized around a single pipeline pattern used by every
example workflow:

    acquire -> validate -> normalize -> analyze -> publish

Modules
-------
validation  : schema, timestamp, and physical-range quality control.
units       : meteorological unit conversions.
projections : CRS helpers and geodesic distance.
vector      : point-geometry construction and spatial joins.
raster      : raster metadata, clipping, reprojection, zonal statistics.
provenance  : structured run metadata for reproducible outputs.
"""

__version__ = "0.1.0"
