#!/usr/bin/env python
"""GPS-linked field-sensor processing (generic, synthetic).

Pipeline: acquire -> validate -> QC -> boundary filter -> spatial join -> summarize

A generic version of the field-sensing pattern: GPS-tagged sensor readings are
cleaned, filtered to a study area with an INWARD buffer (to exclude edge points
that may straddle a neighbouring plot), assigned to research plots by a spatial
join, and summarized per plot.

  1. Generate (or load) GPS-tagged sensor readings.
  2. Validate schema and parse timestamps.
  3. Flag invalid GPS coordinates and physically implausible temperatures.
  4. Apply an inward buffer to each plot, then spatial-join points to plots.
  5. Compute per-plot summaries (canopy minus air temperature, etc.).
  6. Publish clean points, plot summaries, a map, and provenance JSON.

Uses only synthetic data — no proprietary layouts or measurements. Run:
    python run_pipeline.py --buffer-m 15
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from weather_geo import validation
from weather_geo.projections import US_EQUAL_AREA
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
DEFAULT_PLOTS = HERE.parent.parent / "sample-data" / "boundaries" / "field_plots_sample.geojson"

# Plausible ranges specific to this sensor payload (degrees Celsius).
AIR_RANGE = (-30.0, 55.0)
CANOPY_RANGE = (-30.0, 70.0)


def synthetic_readings(plots_bounds: tuple[float, float, float, float], n=400, seed=42):
    """Scatter GPS-tagged readings across (and slightly beyond) the plots.

    Includes deliberate defects: a few points with null/invalid coordinates and
    a few physically implausible temperatures, so the QC steps have work to do.
    """
    minx, miny, maxx, maxy = plots_bounds
    rng = np.random.default_rng(seed)
    pad = 0.0006
    lon = rng.uniform(minx - pad, maxx + pad, n)
    lat = rng.uniform(miny - pad, maxy + pad, n)
    air = rng.normal(28.0, 2.0, n)
    canopy = air + rng.normal(3.0, 1.5, n)  # canopy typically warmer in sun

    df = pd.DataFrame(
        {
            "sensor_id": [f"S{i % 8:02d}" for i in range(n)],
            "timestamp": pd.date_range("2025-06-20T18:00:00Z", periods=n, freq="30s"),
            "longitude": lon,
            "latitude": lat,
            "air_temp_c": air,
            "canopy_temp_c": canopy,
            "qc_flag": "raw",
        }
    )
    # Inject defects.
    df.loc[df.index[:3], ["longitude", "latitude"]] = np.nan
    df.loc[df.index[3], "latitude"] = 200.0  # impossible latitude
    df.loc[df.index[4], "canopy_temp_c"] = 500.0  # implausible reading
    return df


def quality_control(df: pd.DataFrame, meta: RunMetadata) -> pd.DataFrame:
    n0 = len(df)
    df = df.dropna(subset=["longitude", "latitude"]).copy()
    df = df[df["longitude"].between(-180, 180) & df["latitude"].between(-90, 90)]
    dropped_coords = n0 - len(df)

    bad_air = ~df["air_temp_c"].between(*AIR_RANGE)
    bad_canopy = ~df["canopy_temp_c"].between(*CANOPY_RANGE)
    df.loc[bad_air, "air_temp_c"] = pd.NA
    df.loc[bad_canopy, "canopy_temp_c"] = pd.NA
    df["qc_flag"] = np.where(bad_air | bad_canopy, "value_flagged", "pass")

    if dropped_coords:
        meta.warn(f"dropped {dropped_coords} reading(s) with invalid GPS coordinates")
    n_flagged = int((bad_air | bad_canopy).sum())
    if n_flagged:
        meta.warn(f"flagged {n_flagged} reading(s) with implausible temperatures")
    return df.reset_index(drop=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--plots", type=Path, default=DEFAULT_PLOTS)
    ap.add_argument("--input", type=Path, default=None, help="sensor CSV; omit for synthetic")
    ap.add_argument("--buffer-m", type=float, default=15.0, help="inward plot buffer (metres)")
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    import geopandas as gpd

    from weather_geo import vector

    meta = RunMetadata(workflow="05-gps-field-sensor")
    meta.parameters = {"buffer_m": args.buffer_m, "plots": str(args.plots)}

    plots = gpd.read_file(args.plots)
    if args.input:
        raw = pd.read_csv(args.input)
        raw["timestamp"] = validation.parse_timestamps(raw, "timestamp")
        meta.add_source("user sensor readings", uri=Path(args.input).as_uri())
    else:
        raw = synthetic_readings(tuple(plots.total_bounds))
        meta.add_source("synthetic GPS field-sensor readings", uri="generated:synthetic_readings")

    required = ["sensor_id", "timestamp", "longitude", "latitude", "air_temp_c", "canopy_temp_c"]
    vreport = validation.validate_observations(raw, required)
    if not vreport.ok:
        raise SystemExit(f"missing required columns: {vreport.missing_columns}")

    clean = quality_control(raw, meta)
    points = vector.points_from_dataframe(clean)

    # Inward buffer in an equal-area CRS so the buffer distance is truly metres.
    plots_ea = plots.to_crs(US_EQUAL_AREA)
    plots_ea["geometry"] = plots_ea.geometry.buffer(-args.buffer_m)
    plots_ea = plots_ea[~plots_ea.geometry.is_empty]
    plots_buffered = plots_ea.to_crs("EPSG:4326")

    joined = vector.assign_boundary(points, plots_buffered, ["plot_id"])
    inside = joined[joined["plot_id"].notna()].copy()
    meta.parameters["n_readings_clean"] = len(clean)
    meta.parameters["n_readings_in_plots"] = len(inside)
    if len(inside) < len(clean):
        meta.warn(
            f"{len(clean) - len(inside)} reading(s) fell outside the buffered plots and were "
            "excluded from plot summaries (kept in clean points)"
        )

    inside["canopy_minus_air_c"] = inside["canopy_temp_c"] - inside["air_temp_c"]
    summary = (
        inside.groupby("plot_id")
        .agg(
            n_readings=("sensor_id", "size"),
            air_temp_c_mean=("air_temp_c", "mean"),
            canopy_temp_c_mean=("canopy_temp_c", "mean"),
            canopy_minus_air_c_mean=("canopy_minus_air_c", "mean"),
        )
        .round(3)
        .reset_index()
    )

    clean.to_csv(args.output / "sensor_readings_clean.csv", index=False)
    summary.to_csv(args.output / "plot_summaries.csv", index=False)
    try:
        points.to_file(args.output / "sensor_readings.geojson", driver="GeoJSON")
    except Exception as exc:  # pragma: no cover
        meta.warn(f"geojson output skipped: {exc}")

    try:
        from weather_geo import plotting

        plotting.scatter_map(
            inside,
            "longitude",
            "latitude",
            "canopy_minus_air_c",
            "Field sensor readings (canopy - air, degC)",
            args.output / "field_sensors_map.png",
            boundaries=plots,
        )
    except Exception as exc:  # pragma: no cover
        meta.warn(f"map skipped: {exc}")

    (args.output / "summary.json").write_text(
        json.dumps(summary.to_dict(orient="records"), indent=2), encoding="utf-8"
    )
    meta.write(args.output / "processing.json")
    print(f"[ok] {len(inside)}/{len(clean)} readings in plots; {len(summary)} plot summaries.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
