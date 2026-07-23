"""Live MRMS radar products from NOAA's public S3 bucket.

Source: s3://noaa-mrms-pds/CONUS/{product}/{YYYYMMDD}/MRMS_{product}_{ts}.grib2.gz

MRMS grids are gzipped GRIB2 on a 0.01-degree CONUS lat/lon mesh with longitudes
in the 0-360 convention; this module downloads and decompresses the latest
granule, opens it with cfgrib, converts longitudes to [-180, 180], and returns a
CRS-aware ``xarray.DataArray`` ready for the raster workflow (clip/reproject/
zonal statistics).
"""

from __future__ import annotations

import gzip

import numpy as np

from .http import CACHE_DIR, s3_filesystem

BUCKET = "noaa-mrms-pds"
DEFAULT_PRODUCT = "RadarOnly_QPE_01H_00.00"  # radar-only 1-h QPE (a *derived estimate*)


def latest_key(product: str = DEFAULT_PRODUCT):
    """Return the most recent granule S3 key for a product (searches back days)."""
    fs = s3_filesystem()
    base = f"{BUCKET}/CONUS/{product}"
    day_dirs = sorted(fs.ls(base))
    for day in reversed(day_dirs[-3:]):  # today may be empty early; look back
        files = sorted(fs.ls(day))
        grib = [f for f in files if f.endswith(".grib2.gz")]
        if grib:
            return grib[-1]
    raise FileNotFoundError(f"no MRMS granules found for product {product}")


def fetch_grid(product: str = DEFAULT_PRODUCT, key: str | None = None, use_cache: bool = True):
    """Download the latest (or a specified) MRMS granule and open it as a DataArray."""
    import xarray as xr

    fs = s3_filesystem()
    key = key or latest_key(product)
    name = key.split("/")[-1]
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    gz_path = CACHE_DIR / name
    grib_path = CACHE_DIR / name[:-3]  # strip .gz

    if not (use_cache and grib_path.exists()):
        if not (use_cache and gz_path.exists()):
            fs.get(key, str(gz_path))
        with gzip.open(gz_path, "rb") as fin:
            grib_path.write_bytes(fin.read())

    ds = xr.open_dataset(grib_path, engine="cfgrib", backend_kwargs={"indexpath": ""})
    var = list(ds.data_vars)[0]
    da = ds[var]

    # 0-360 -> -180..180 and sort ascending so clipping to a US bbox works.
    if float(da["longitude"].max()) > 180:
        da = da.assign_coords(longitude=(((da["longitude"] + 180) % 360) - 180))
        da = da.sortby("longitude")
    da = da.rename({"longitude": "x", "latitude": "y"})
    da = da.sortby("y")
    da = da.rename("precip_mm")
    da.attrs["units"] = "mm"
    da.attrs["long_name"] = f"MRMS {product} (radar-derived estimate)"
    da.attrs["mrms_product"] = product
    da.attrs["source_granule"] = name

    import rioxarray  # noqa: F401  (registers .rio)

    # MRMS uses -3 / -999 as missing/no-coverage sentinels.
    da = da.where(da > -1.0)
    da.rio.write_crs("EPSG:4326", inplace=True)
    da.rio.write_nodata(np.nan, inplace=True)
    return da
