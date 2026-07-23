#!/usr/bin/env python
"""Surface-observation acquisition and quality control.

Pipeline: acquire -> validate -> normalize -> analyze -> publish

  1. Load METAR-style surface observations (bundled sample by default; a real
     source can be dropped in via --input).
  2. Validate required columns, timestamps, coordinates, and physical ranges.
  3. Normalize units to SI/metric (degF->degC, kt->m/s, in->mm).
  4. Find the nearest valid station to a target location (geodesic distance).
  5. Publish CSV + GeoJSON outputs, a station map, and provenance JSON.

The vector/plot steps degrade gracefully: if geopandas/matplotlib are not
installed, the tabular outputs and provenance are still produced.

Run:
    python run_pipeline.py --target-lon -93.6 --target-lat 41.6
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from weather_geo import units, validation
from weather_geo.projections import nearest_point
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
DEFAULT_INPUT = HERE.parent.parent / "sample-data" / "observations" / "surface_obs_sample.csv"
REQUIRED = ["station_id", "timestamp", "longitude", "latitude", "temperature_f"]


def normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Convert to metric units and standardized column names."""
    out = pd.DataFrame(
        {
            "station_id": df["station_id"],
            "timestamp": validation.parse_timestamps(df, "timestamp"),
            "longitude": pd.to_numeric(df["longitude"], errors="coerce"),
            "latitude": pd.to_numeric(df["latitude"], errors="coerce"),
            "temperature_c": units.fahrenheit_to_celsius(
                pd.to_numeric(df["temperature_f"], errors="coerce")
            ),
            "dewpoint_c": units.fahrenheit_to_celsius(
                pd.to_numeric(df.get("dewpoint_f"), errors="coerce")
            ),
            "wind_speed_mps": units.knots_to_mps(
                pd.to_numeric(df.get("wind_speed_kt"), errors="coerce")
            ),
            "wind_direction_deg": pd.to_numeric(df.get("wind_direction_deg"), errors="coerce"),
            "pressure_hpa": pd.to_numeric(df.get("pressure_hpa"), errors="coerce"),
            "precip_mm": units.inches_to_mm(pd.to_numeric(df.get("precip_in"), errors="coerce")),
        }
    )
    return out


def clean(df: pd.DataFrame, meta: RunMetadata) -> pd.DataFrame:
    """Drop rows that cannot be trusted, recording why in provenance."""
    n0 = len(df)
    df = df[df["timestamp"].notna()]
    df = df[df["longitude"].between(-180, 180) & df["latitude"].between(-90, 90)]
    # Re-flag physical ranges on normalized data and null out impossible values.
    ranges = validation.flag_out_of_range(df)
    for col, (lo, hi) in validation.PHYSICAL_RANGES.items():
        if col in df.columns:
            df.loc[~df[col].between(lo, hi), col] = pd.NA
    dropped = n0 - len(df)
    if dropped:
        meta.warn(f"dropped {dropped} row(s) with bad timestamp or coordinates")
    if ranges:
        meta.warn(f"out-of-range values nulled by column: {ranges}")
    return df.reset_index(drop=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    ap.add_argument("--live", action="store_true", help="fetch live IEM ASOS observations")
    ap.add_argument("--valid", default=None, help="UTC valid time for --live (YYYY-MM-DDTHH:MM)")
    ap.add_argument("--target-lon", type=float, default=-93.6)
    ap.add_argument("--target-lat", type=float, default=41.6)
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    meta = RunMetadata(workflow="01-surface-observations")
    meta.parameters = {"target": [args.target_lon, args.target_lat]}

    if args.live:
        from datetime import datetime, timezone

        from weather_geo.acquire import asos

        if args.valid:
            valid = datetime.fromisoformat(args.valid).replace(tzinfo=timezone.utc)
            raw = asos.fetch_surface_obs(valid)
        else:
            valid, raw = asos.fetch_recent()
        meta.parameters["valid_time"] = valid.isoformat()
        meta.add_source("IEM ASOS (live)", uri=asos.ENDPOINT, valid_time=valid.isoformat())
        if raw.empty:
            raise SystemExit("live ASOS returned no observations for the requested time")
    else:
        meta.parameters["input"] = str(args.input)
        meta.add_source("bundled sample (METAR-style)", uri=args.input.as_uri())
        raw = pd.read_csv(args.input)
    report = validation.validate_observations(raw, REQUIRED)
    if not report.ok:
        raise SystemExit(f"missing required columns: {report.missing_columns}")
    if validation.looks_like_swapped_lonlat(raw):
        meta.warn("input contains rows where longitude/latitude appear swapped")

    clean_df = clean(normalize(raw), meta)

    # Nearest valid station to the target (geodesic).
    candidates = list(
        clean_df[["station_id", "longitude", "latitude"]].itertuples(index=False, name=None)
    )
    station_id, dist_km = nearest_point(args.target_lon, args.target_lat, candidates)

    # Publish -------------------------------------------------------------
    csv_path = args.output / "surface_obs_clean.csv"
    clean_df.to_csv(csv_path, index=False)

    summary = {
        "validation": report.as_dict(),
        "n_clean": len(clean_df),
        "nearest_station": {"station_id": station_id, "distance_km": round(dist_km, 2)},
    }
    (args.output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    try:  # optional geospatial + plot outputs
        from weather_geo import plotting, vector

        gdf = vector.points_from_dataframe(clean_df)
        gdf.to_file(args.output / "surface_obs.geojson", driver="GeoJSON")
        plotting.scatter_map(
            clean_df,
            "longitude",
            "latitude",
            "temperature_c",
            "Surface observations (temperature, degC)",
            args.output / "station_network.png",
        )
    except Exception as exc:  # pragma: no cover - depends on optional stack
        meta.warn(f"geospatial/plot outputs skipped: {exc}")

    meta.write(args.output / "processing.json")
    print(
        f"[ok] {len(clean_df)} clean obs; nearest station {station_id} "
        f"({dist_km:.1f} km). Outputs in {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
