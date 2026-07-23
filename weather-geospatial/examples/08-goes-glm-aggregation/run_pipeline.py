#!/usr/bin/env python
"""GOES-GLM lightning spatial aggregation.

Pipeline: discover -> read -> validate -> aggregate -> publish

  1. Discover the GLM "files" covering a time window (synthetic in-memory files
     by default, standing in for object-storage discovery). Partial/duplicate
     files are detected defensively.
  2. Read flash lon/lat/energy from each file.
  3. Validate coordinates (drop invalid) and track which files contributed.
  4. Aggregate flashes into a regular grid -> flash-count density.
  5. Publish a density GeoTIFF, per-cell GeoJSON, a map, and provenance JSON.

The engineering value here is not the lightning map: it is defensive file
discovery, recognizing partial/duplicate files, maintaining time coverage, and
recording which source files contributed to each output.

Run:
    python run_pipeline.py --cell-size 0.1
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from weather_geo import aggregation
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
BBOX = (-96.6, 40.4, -90.1, 43.5)  # Iowa


def synthetic_glm_files(seed: int = 20250620) -> list[dict]:
    """Stand in for GLM granules discovered in object storage.

    Returns a list of "files", each a dict with a name, a nominal time, and a
    flashes DataFrame. Deliberately includes a truncated (partial) file and a
    duplicate of an earlier granule so the discovery logic has to cope.
    """
    rng = np.random.default_rng(seed)
    minx, miny, maxx, maxy = BBOX
    cx, cy = minx + 0.6 * (maxx - minx), miny + 0.55 * (maxy - miny)

    def make_flashes(n):
        lon = np.clip(rng.normal(cx, 0.5, n), minx - 1, maxx + 1)
        lat = np.clip(rng.normal(cy, 0.4, n), miny - 1, maxy + 1)
        energy = rng.gamma(2.0, 1e-15, n)
        df = pd.DataFrame({"longitude": lon, "latitude": lat, "energy_j": energy})
        # A few invalid coordinates as real granules occasionally contain.
        df.loc[df.index[:2], "latitude"] = 200.0
        return df

    files = [
        {
            "name": "OR_GLM_20250620T2000.nc",
            "time": "2025-06-20T20:00:00Z",
            "flashes": make_flashes(400),
        },
        {
            "name": "OR_GLM_20250620T2005.nc",
            "time": "2025-06-20T20:05:00Z",
            "flashes": make_flashes(520),
        },
        {
            "name": "OR_GLM_20250620T2010.nc",
            "time": "2025-06-20T20:10:00Z",
            "flashes": make_flashes(610),
        },
    ]
    # A truncated/partial download (short) and an exact duplicate granule name.
    partial = {
        "name": "OR_GLM_20250620T2015.nc",
        "time": "2025-06-20T20:15:00Z",
        "flashes": make_flashes(600).iloc[:5],
        "bytes_expected": 600,
        "bytes_got": 5,
    }
    duplicate = dict(files[1])  # same name as the 20:05 granule
    return [files[0], files[1], files[2], partial, duplicate]


def discover_and_read(files: list[dict], meta: RunMetadata) -> pd.DataFrame:
    """Defensively read granules: skip duplicates and partial downloads."""
    seen: set[str] = set()
    frames = []
    for f in files:
        if f["name"] in seen:
            meta.warn(f"duplicate granule skipped: {f['name']}")
            continue
        if f.get("bytes_expected") and f.get("bytes_got", 0) < f["bytes_expected"]:
            meta.warn(
                f"partial download skipped: {f['name']} "
                f"({f['bytes_got']}/{f['bytes_expected']} bytes)"
            )
            continue
        seen.add(f["name"])
        df = f["flashes"].copy()
        df["source_file"] = f["name"]
        frames.append(df)
        meta.add_source(f["name"], uri=f"granule:{f['name']}", nominal_time=f["time"])
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--cell-size", type=float, default=0.1, help="grid cell size in degrees")
    ap.add_argument("--live", action="store_true", help="fetch live GOES-19 GLM granules from S3")
    ap.add_argument("--minutes", type=int, default=10, help="live time window length")
    ap.add_argument("--hours-back", type=int, default=4, help="how far back to look (availability)")
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    # Live GLM is full-disk; aggregate over CONUS so the density product is meaningful.
    conus = (-125.0, 24.0, -66.0, 50.0)
    bbox = conus if args.live else BBOX
    cell = args.cell_size if not args.live else max(args.cell_size, 0.25)

    meta = RunMetadata(workflow="08-goes-glm-aggregation")
    meta.parameters = {"bbox": list(bbox), "cell_size_deg": cell}

    if args.live:
        from weather_geo.acquire import glm

        start, end, flashes, skipped = glm.fetch_recent(
            minutes=args.minutes, hours_back=args.hours_back
        )
        meta.parameters["window"] = [start.isoformat(), end.isoformat()]
        meta.add_source(
            "GOES-19 GLM (live S3)",
            uri=f"s3://{glm.SATELLITE}",
            window_start=start.isoformat(),
            window_end=end.isoformat(),
        )
        for name in skipped:
            meta.warn(f"granule failed to open and was skipped: {name}")
        if flashes.empty:
            raise SystemExit("no GLM flashes found in the requested window")
    else:
        files = synthetic_glm_files()
        flashes = discover_and_read(files, meta)
        if flashes.empty:
            raise SystemExit("no usable granules discovered")

    n_raw = len(flashes)
    flashes = flashes[
        flashes["longitude"].between(-180, 180) & flashes["latitude"].between(-90, 90)
    ]
    n_invalid = n_raw - len(flashes)
    if n_invalid:
        meta.warn(f"dropped {n_invalid} flash(es) with invalid coordinates")

    counts, x_edges, y_edges = aggregation.bin_points_to_grid(
        flashes["longitude"], flashes["latitude"], bbox, cell
    )
    grid_summary = aggregation.summarize_grid(counts)

    meta.parameters["contributing_files"] = sorted(flashes["source_file"].unique().tolist())
    summary = {
        "n_flashes_used": len(flashes),
        "n_invalid_dropped": n_invalid,
        "n_files_contributing": flashes["source_file"].nunique(),
        "grid": grid_summary,
    }
    (args.output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    try:
        da = aggregation.grid_to_dataarray(counts, x_edges, y_edges, "flash_count")
        da.rio.to_raster(args.output / "glm_flash_density.tif", driver="GTiff", compress="DEFLATE")
        from weather_geo import plotting

        plotting.raster_map(
            da, "GLM flash density (count per cell)", args.output / "flash_density_map.png"
        )
    except Exception as exc:  # pragma: no cover
        meta.warn(f"raster/map output skipped: {exc}")

    meta.write(args.output / "processing.json")
    print(
        f"[ok] {len(flashes)} flashes from {summary['n_files_contributing']} files; "
        f"{grid_summary['n_nonzero_cells']} active cells. Outputs in {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
