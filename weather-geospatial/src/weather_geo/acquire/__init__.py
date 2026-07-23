"""Live-data acquisition for the example workflows.

Each module fetches from an authoritative public source and returns data in the
*same schema* the offline sample data uses, so a workflow's ``--live`` path and
its default offline path converge on identical downstream code.

All network access is confined to this subpackage. Downloads are cached under
``weather-geospatial/data-cache/`` (git-ignored).

Modules
-------
spc   : SPC storm reports (HTTP CSV)
asos  : IEM ASOS surface observations (HTTP CSV)
ghcn  : NCEI GHCN-Daily climate data (HTTP CSV)
mrms  : MRMS radar QPE (anonymous S3, gzipped GRIB2)
hrrr  : HRRR model winds (S3 + .idx HTTP byte-ranging, GRIB2)
glm   : GOES-19 GLM lightning (anonymous S3, NetCDF)
"""

from __future__ import annotations
