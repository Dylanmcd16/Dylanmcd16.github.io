#!/usr/bin/env python
"""HRRR model processing and model-vs-observation comparison.

Pipeline: acquire -> subset -> derive -> sample -> compare -> publish

  1. Load a small HRRR-style U/V wind field (synthetic by default so the example
     is a compact, reproducible subset rather than a multi-GB download).
  2. Subset to a bounding box.
  3. Derive 10 m wind speed from the U and V components.
  4. Sample the model grid at surface-station locations.
  5. Compare model wind speed against station observations (model - obs).
  6. Publish a GeoTIFF of the field, a residual table + points, a map, and
     provenance JSON.

HONESTY NOTE: this is a geospatial *model-data processing* example. Sampling the
grid at a station yields the MODEL value there, not an observation, and this
small demo is not a formal model-verification study.

Requires the ``raster`` extra. Run:
    python run_pipeline.py
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from weather_geo import model, units, validation
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
DEFAULT_OBS = HERE.parent.parent / "sample-data" / "observations" / "surface_obs_sample.csv"
BBOX = (-96.6, 40.4, -90.1, 43.5)  # Iowa


def station_winds_from_df(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize station obs, converting observed wind (knots) to m/s for comparison."""
    df = df.copy()
    df["timestamp"] = validation.parse_timestamps(df, "timestamp")
    df = df[df["timestamp"].notna()].copy()
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df = df[df["longitude"].between(BBOX[0], BBOX[2]) & df["latitude"].between(BBOX[1], BBOX[3])]
    df["obs_wind_mps"] = units.knots_to_mps(pd.to_numeric(df["wind_speed_kt"], errors="coerce"))
    return df.dropna(subset=["obs_wind_mps"]).reset_index(drop=True)


def load_station_winds(path: Path) -> pd.DataFrame:
    """Load stations from a CSV and convert observed wind to m/s."""
    return station_winds_from_df(pd.read_csv(path))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--observations", type=Path, default=DEFAULT_OBS)
    ap.add_argument("--live", action="store_true", help="fetch live HRRR winds + IEM ASOS obs")
    ap.add_argument("--fcst-hour", type=int, default=1, help="HRRR forecast hour for --live")
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    meta = RunMetadata(workflow="07-hrrr-model-processing")
    meta.parameters = {"bbox": list(BBOX)}

    if args.live:
        from datetime import timedelta

        from weather_geo.acquire import asos, hrrr

        ds, hmeta = hrrr.fetch_wind_field(fcst_hour=args.fcst_hour, bounds=BBOX)
        valid = datetime.fromisoformat(hmeta["day"]).replace(
            hour=hmeta["cycle"], tzinfo=timezone.utc
        ) + timedelta(hours=hmeta["fcst_hour"])
        meta.parameters["hrrr"] = {k: hmeta[k] for k in ("day", "cycle", "fcst_hour")}
        meta.parameters["valid_time"] = valid.isoformat()
        meta.add_source(
            "HRRR 10 m winds (live S3, .idx subset)", uri="s3://noaa-hrrr-bdp-pds", key=hmeta["key"]
        )
        meta.add_source(
            "IEM ASOS observations (live)", uri=asos.ENDPOINT, valid_time=valid.isoformat()
        )
        stations = station_winds_from_df(asos.fetch_surface_obs(valid))
    else:
        meta.add_source(
            "synthetic HRRR-style 10 m winds (model-data stand-in)",
            uri="generated:weather_geo.model.synthetic_wind_field",
        )
        meta.add_source("surface station observations", uri=args.observations.as_uri())
        ds = model.synthetic_wind_field(BBOX)
        stations = load_station_winds(args.observations)

    ds = model.derive_wind_speed(ds)
    speed = ds["wind_speed"]

    model_vals = model.sample_at_points(speed, stations["longitude"], stations["latitude"])
    stations["model_wind_mps"] = np.round(model_vals, 3)
    stations["residual_mps"] = np.round(stations["model_wind_mps"] - stations["obs_wind_mps"], 3)

    n_offgrid = int(np.isnan(model_vals).sum())
    if n_offgrid:
        meta.warn(f"{n_offgrid} station(s) fell outside the model grid (residual = NaN)")

    cols = [
        "station_id",
        "longitude",
        "latitude",
        "obs_wind_mps",
        "model_wind_mps",
        "residual_mps",
    ]
    stations[cols].to_csv(args.output / "model_vs_obs.csv", index=False)

    resid = stations["residual_mps"].dropna()
    summary = {
        "n_stations": len(stations),
        "n_offgrid": n_offgrid,
        "bias_mps": round(float(resid.mean()), 3) if len(resid) else None,
        "rmse_mps": round(float(np.sqrt((resid**2).mean())), 3) if len(resid) else None,
        "note": "model minus observation; small demo, not a formal verification study",
    }
    (args.output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    try:
        speed.rio.to_raster(args.output / "hrrr_wind_speed.tif", driver="GTiff", compress="DEFLATE")
    except Exception as exc:  # pragma: no cover
        meta.warn(f"GeoTIFF output skipped: {exc}")

    try:
        from weather_geo import plotting, vector

        pts = vector.points_from_dataframe(stations.dropna(subset=["residual_mps"]))
        pts.to_file(args.output / "model_vs_obs.geojson", driver="GeoJSON")
        plotting.raster_map(
            speed, "HRRR-style 10 m wind speed (m/s)", args.output / "wind_speed_map.png"
        )
    except Exception as exc:  # pragma: no cover
        meta.warn(f"map/geojson skipped: {exc}")

    meta.write(args.output / "processing.json")
    print(
        f"[ok] {len(stations)} stations; bias {summary['bias_mps']} m/s, "
        f"RMSE {summary['rmse_mps']} m/s. Outputs in {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
