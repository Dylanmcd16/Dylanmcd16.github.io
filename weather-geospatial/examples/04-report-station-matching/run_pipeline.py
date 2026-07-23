#!/usr/bin/env python
"""Storm-report to station spatial-temporal matching.

Pipeline: acquire -> validate -> match (space + time) -> diagnose -> publish

  1. Load storm reports and station observations (bundled samples by default).
  2. Validate required fields and parse tz-aware timestamps.
  3. For each report, find the nearest valid observation within a distance and
     time window (geodesic distance; deterministic tie-break).
  4. Preserve every report: unmatched reports are kept and labeled, not dropped.
  5. Publish an evidence table, optional connection lines for mapping, a match
     diagnostics summary, and provenance JSON.

Run:
    python run_pipeline.py --max-distance-km 50 --time-window-min 30
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from weather_geo import validation
from weather_geo.matching import MatchConfig, match_reports_to_observations
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
SAMPLE = HERE.parent.parent / "sample-data" / "observations"
DEFAULT_REPORTS = SAMPLE / "storm_reports_sample.csv"
DEFAULT_OBS = SAMPLE / "mesonet_obs_sample.csv"


def _load(path: Path, required: list[str]) -> pd.DataFrame:
    df = pd.read_csv(path)
    report = validation.validate_observations(df, required, timestamp_col="timestamp")
    if not report.ok:
        raise SystemExit(f"{path.name}: missing required columns {report.missing_columns}")
    df["timestamp"] = validation.parse_timestamps(df, "timestamp")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    return df


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reports", type=Path, default=DEFAULT_REPORTS)
    ap.add_argument("--observations", type=Path, default=DEFAULT_OBS)
    ap.add_argument("--live", action="store_true", help="fetch live SPC reports + IEM ASOS obs")
    ap.add_argument("--date", default=None, help="convective day for --live (YYYY-MM-DD)")
    ap.add_argument("--max-distance-km", type=float, default=50.0)
    ap.add_argument("--time-window-min", type=float, default=30.0)
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    meta = RunMetadata(workflow="04-report-station-matching")
    meta.parameters = {
        "max_distance_km": args.max_distance_km,
        "time_window_min": args.time_window_min,
    }

    if args.live:
        from datetime import datetime, timedelta, timezone

        from weather_geo.acquire import asos, spc

        if args.date:
            day = datetime.fromisoformat(args.date).date()
            reports = spc.fetch_storm_reports(day)
        else:
            day, reports = spc.fetch_latest()
        # Reports run 12Z on the convective day to 12Z the next; match obs likewise.
        start = datetime(day.year, day.month, day.day, 12, tzinfo=timezone.utc)
        obs = asos.fetch_timeseries(start, start + timedelta(hours=24))
        reports = reports.dropna(subset=["timestamp", "longitude", "latitude"]).reset_index(
            drop=True
        )
        meta.parameters["convective_day"] = day.isoformat()
        meta.add_source("SPC storm reports (live)", uri=spc.BASE, convective_day=day.isoformat())
        meta.add_source("IEM ASOS observations (live)", uri=asos.ENDPOINT)
        if reports.empty or obs.empty:
            raise SystemExit("live reports or observations were empty for the requested day")
    else:
        meta.add_source("bundled sample storm reports", uri=args.reports.as_uri())
        meta.add_source("bundled sample station observations", uri=args.observations.as_uri())
        reports = _load(args.reports, ["report_id", "timestamp", "longitude", "latitude"])
        obs = _load(
            args.observations, ["station_id", "timestamp", "longitude", "latitude", "value"]
        )
    dropped_obs = int(obs[["longitude", "latitude"]].isna().any(axis=1).sum())
    if dropped_obs:
        meta.warn(f"{dropped_obs} observation(s) had missing coordinates and were excluded")

    cfg = MatchConfig(
        max_distance_km=args.max_distance_km, time_window_minutes=args.time_window_min
    )
    matches = match_reports_to_observations(reports, obs, cfg)

    evidence_path = args.output / "match_evidence.csv"
    matches.to_csv(evidence_path, index=False)

    status_counts = matches["match_status"].value_counts().to_dict()
    matched = matches[matches["match_status"] == "matched"]
    summary = {
        "n_reports": len(reports),
        "n_observations": len(obs),
        "match_status": status_counts,
        "median_distance_km": (
            round(float(matched["distance_km"].median()), 2) if len(matched) else None
        ),
        "median_time_diff_min": (
            round(float(matched["time_difference_minutes"].median()), 2) if len(matched) else None
        ),
    }
    (args.output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    n_unmatched = len(matches) - len(matched)
    if n_unmatched:
        meta.warn(f"{n_unmatched} report(s) had no station in range (kept, labeled)")

    # Optional: connection lines (report -> matched station) for mapping.
    try:
        import geopandas as gpd
        from shapely.geometry import LineString

        rep_idx = reports.set_index("report_id")
        obs_idx = obs.set_index("station_id")
        lines, attrs = [], []
        for m in matched.itertuples(index=False):
            r = rep_idx.loc[m.report_id]
            s = obs_idx.loc[m.station_id]
            lines.append(LineString([(r.longitude, r.latitude), (s.longitude, s.latitude)]))
            attrs.append(
                {
                    "report_id": m.report_id,
                    "station_id": m.station_id,
                    "distance_km": m.distance_km,
                }
            )
        if lines:
            gdf = gpd.GeoDataFrame(attrs, geometry=lines, crs="EPSG:4326")
            gdf.to_file(args.output / "match_lines.geojson", driver="GeoJSON")
    except Exception as exc:  # pragma: no cover - optional stack
        meta.warn(f"connection-line output skipped: {exc}")

    meta.write(args.output / "processing.json")
    print(f"[ok] {len(reports)} reports -> match status {status_counts}. Outputs in {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
