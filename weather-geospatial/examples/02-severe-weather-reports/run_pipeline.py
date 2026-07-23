#!/usr/bin/env python
"""Severe-weather storm-report ETL and spatial reconciliation.

Pipeline: acquire -> validate -> normalize -> deduplicate -> spatial join -> publish

  1. Load SPC/NWS-style storm reports (bundled sample by default).
  2. Validate required fields and timestamps.
  3. Normalize event types (HAIL/hail -> hail) and magnitude units.
  4. Remove exact duplicates and probable duplicates (same event type within a
     small distance and time window) while KEEPING late/revised reports.
  5. Assign county/state via a point-in-polygon spatial join.
  6. Publish GeoJSON, a cleaned CSV, a daily event map, and provenance JSON.

Run:
    python run_pipeline.py --aoi ../../sample-data/boundaries/iowa_counties_sample.geojson
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from weather_geo import validation
from weather_geo.projections import haversine_km
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
DEFAULT_INPUT = HERE.parent.parent / "sample-data" / "observations" / "storm_reports_sample.csv"
DEFAULT_AOI = HERE.parent.parent / "sample-data" / "boundaries" / "iowa_counties_sample.geojson"
REQUIRED = ["report_id", "event_type", "timestamp", "longitude", "latitude"]

EVENT_MAP = {"hail": "hail", "tornado": "tornado", "wind": "wind"}
# Magnitude normalization targets: hail->inches, wind->mph (kept as reported).


def normalize_events(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["event_type"] = out["event_type"].astype(str).str.strip().str.lower().map(EVENT_MAP)
    out["timestamp"] = validation.parse_timestamps(out, "timestamp")
    out["longitude"] = pd.to_numeric(out["longitude"], errors="coerce")
    out["latitude"] = pd.to_numeric(out["latitude"], errors="coerce")
    out["magnitude"] = pd.to_numeric(out.get("magnitude"), errors="coerce")
    return out


def deduplicate(df: pd.DataFrame, meta: RunMetadata, km: float = 3.0, minutes: int = 15):
    """Drop probable duplicates: same event type within ``km`` and ``minutes``.

    Sorted by timestamp so the earliest report in a cluster is retained; later
    revised reports at new locations are preserved because the distance/time
    gate must be satisfied for a row to be treated as a duplicate.
    """
    df = df.sort_values("timestamp").reset_index(drop=True)
    keep = []
    dropped = 0
    for _, row in df.iterrows():
        is_dup = False
        for k in keep:
            if k["event_type"] != row["event_type"]:
                continue
            dt = abs((row["timestamp"] - k["timestamp"]).total_seconds()) / 60.0
            if dt > minutes:
                continue
            if haversine_km(row.longitude, row.latitude, k["longitude"], k["latitude"]) <= km:
                is_dup = True
                break
        if is_dup:
            dropped += 1
        else:
            keep.append(row)
    if dropped:
        meta.warn(f"removed {dropped} probable duplicate report(s) ({km} km / {minutes} min gate)")
    return pd.DataFrame(keep).reset_index(drop=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    ap.add_argument("--aoi", type=Path, default=DEFAULT_AOI)
    ap.add_argument("--live", action="store_true", help="fetch live SPC storm reports")
    ap.add_argument("--date", default=None, help="convective day for --live (YYYY-MM-DD)")
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    meta = RunMetadata(workflow="02-severe-weather-reports")
    meta.parameters = {"aoi": str(args.aoi)}

    if args.live:
        from datetime import datetime

        from weather_geo.acquire import spc

        if args.date:
            day = datetime.fromisoformat(args.date).date()
            raw = spc.fetch_storm_reports(day)
        else:
            day, raw = spc.fetch_latest()
        meta.parameters["convective_day"] = day.isoformat()
        meta.add_source("SPC storm reports (live)", uri=spc.BASE, convective_day=day.isoformat())
        if raw.empty:
            raise SystemExit(f"no SPC reports for {day}")
    else:
        meta.parameters["input"] = str(args.input)
        meta.add_source("bundled sample (SPC/NWS-style storm reports)", uri=args.input.as_uri())
        raw = pd.read_csv(args.input)
    report = validation.validate_observations(raw, REQUIRED)
    if not report.ok:
        raise SystemExit(f"missing required columns: {report.missing_columns}")

    df = normalize_events(raw)
    unknown = df["event_type"].isna().sum()
    if unknown:
        meta.warn(f"{unknown} report(s) had an unrecognized event type and were dropped")
        df = df[df["event_type"].notna()]
    # Drop rows with unusable coordinates/timestamps (kept count in provenance).
    n0 = len(df)
    df = df[
        df["timestamp"].notna()
        & df["longitude"].between(-180, 180)
        & df["latitude"].between(-90, 90)
    ]
    if len(df) < n0:
        meta.warn(f"dropped {n0 - len(df)} report(s) with bad coordinates/timestamp")

    df = deduplicate(df, meta)

    csv_path = args.output / "storm_reports_clean.csv"
    df.to_csv(csv_path, index=False)

    counts = df["event_type"].value_counts().to_dict()
    summary = {"validation": report.as_dict(), "n_clean": len(df), "by_event_type": counts}

    try:  # optional spatial join + map
        import geopandas as gpd

        from weather_geo import plotting, vector

        points = vector.points_from_dataframe(df)
        boundaries = gpd.read_file(args.aoi)
        joined = vector.assign_boundary(points, boundaries, ["county", "state"])
        joined.to_file(args.output / "storm_reports.geojson", driver="GeoJSON")
        n_unassigned = int(joined["county"].isna().sum())
        summary["n_outside_aoi"] = n_unassigned
        if n_unassigned:
            meta.warn(f"{n_unassigned} report(s) fell outside all AOI polygons (kept, null county)")
        plotting.scatter_map(
            df,
            "longitude",
            "latitude",
            None,
            "Storm reports (deduplicated)",
            args.output / "storm_reports_map.png",
            boundaries=boundaries,
        )
    except Exception as exc:  # pragma: no cover
        meta.warn(f"spatial join / map skipped: {exc}")

    (args.output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    meta.write(args.output / "processing.json")
    print(f"[ok] {len(df)} reports after dedup; by type {counts}. Outputs in {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
