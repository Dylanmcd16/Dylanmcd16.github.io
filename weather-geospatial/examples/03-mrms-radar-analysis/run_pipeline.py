#!/usr/bin/env python
"""MRMS-style precipitation raster analysis and zonal statistics.

Pipeline: acquire -> inspect -> clip -> reproject -> analyze -> publish

  1. Build (or load) a small precipitation raster over an AOI. By default a
     deterministic synthetic grid stands in for an MRMS radar-only QPE product
     so the example runs offline; --input accepts a real GRIB2/GeoTIFF.
  2. Record raster metadata (variable, CRS, transform, nodata, valid range).
  3. Clip to the AOI and reproject to an equal-area CRS (EPSG:5070) so area-
     based statistics are meaningful.
  4. Compute per-county zonal max / mean / exceedance-pixel statistics.
  5. Publish a Cloud Optimized GeoTIFF, a statistics table, a map, and
     provenance JSON.

NOTE ON MEANING: MRMS radar-only QPE is a radar-derived *estimate* of
precipitation, not a gauge measurement. Products like MESH are likewise
radar-derived estimates, not observed hail sizes.

Requires the ``raster`` and ``geo`` extras. Run:
    python run_pipeline.py --aoi ../../sample-data/boundaries/iowa_counties_sample.geojson
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from weather_geo import raster
from weather_geo.projections import US_EQUAL_AREA
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
DEFAULT_AOI = HERE.parent.parent / "sample-data" / "boundaries" / "iowa_counties_sample.geojson"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, default=None, help="GRIB2/GeoTIFF; omit for synthetic")
    ap.add_argument("--live", action="store_true", help="fetch the latest live MRMS QPE from S3")
    ap.add_argument("--product", default=None, help="MRMS product for --live")
    ap.add_argument("--aoi", type=Path, default=DEFAULT_AOI)
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    import geopandas as gpd
    import rioxarray  # noqa: F401

    meta = RunMetadata(workflow="03-mrms-radar-analysis")
    meta.parameters = {"aoi": str(args.aoi), "output_crs": US_EQUAL_AREA}

    if args.live:
        from weather_geo.acquire import mrms

        da = mrms.fetch_grid(product=args.product or mrms.DEFAULT_PRODUCT)
        meta.parameters["mrms_product"] = da.attrs.get("mrms_product")
        meta.add_source(
            "MRMS radar QPE (live S3, radar-derived estimate)",
            uri="s3://noaa-mrms-pds",
            granule=da.attrs.get("source_granule"),
        )
    elif args.input:
        import rioxarray as rxr

        da = rxr.open_rasterio(args.input, masked=True).squeeze()
        meta.add_source("user raster", uri=Path(args.input).as_uri())
    else:
        da = raster.synthetic_precip_grid()
        meta.add_source(
            "synthetic MRMS-style QPE (radar-derived estimate stand-in)",
            uri="generated:weather_geo.raster.synthetic_precip_grid",
        )

    meta_before = raster.raster_metadata(da)

    boundaries = gpd.read_file(args.aoi)
    clipped = raster.clip_to_geometry(da, boundaries.geometry.values, boundaries.crs)
    reprojected = raster.reproject(clipped, US_EQUAL_AREA, resampling="bilinear")

    stats = raster.zonal_statistics(reprojected, boundaries, "county")
    stats_path = args.output / "county_precip_statistics.csv"
    stats.to_csv(stats_path, index=False)

    # Cloud Optimized GeoTIFF output.
    cog_path = args.output / "mrms_precip_cog.tif"
    try:
        reprojected.rio.to_raster(cog_path, driver="COG", compress="DEFLATE")
    except Exception:  # COG driver not always available; fall back to GTiff
        reprojected.rio.to_raster(cog_path, driver="GTiff", compress="DEFLATE")
        meta.warn("COG driver unavailable; wrote a standard GeoTIFF instead")

    try:
        from weather_geo import plotting

        plotting.raster_map(
            reprojected,
            "MRMS-style storm-total precipitation (mm)",
            args.output / "county_precip_map.png",
            boundaries=boundaries,
        )
    except Exception as exc:  # pragma: no cover
        meta.warn(f"map skipped: {exc}")

    meta.parameters["metadata_before"] = meta_before
    meta.parameters["metadata_after"] = raster.raster_metadata(reprojected)
    (args.output / "summary.json").write_text(
        json.dumps({"zonal_statistics": stats.to_dict(orient="records")}, indent=2),
        encoding="utf-8",
    )
    meta.write(args.output / "processing.json")
    print(f"[ok] zonal stats for {len(stats)} zones written to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
