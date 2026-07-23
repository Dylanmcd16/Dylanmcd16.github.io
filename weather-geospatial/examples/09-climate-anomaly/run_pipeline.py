#!/usr/bin/env python
"""Climate normals and anomaly mapping.

Pipeline: acquire -> validate -> normals -> anomaly -> aggregate -> publish

  1. Load GHCN-style monthly station values (bundled sample by default).
  2. Validate schema, coordinates, and value ranges.
  3. Compute per-station monthly normals over a baseline period.
  4. Compute the target period's departure from normal (anomaly).
  5. Join anomalies to stations (and optionally aggregate to boundaries).
  6. Publish a station anomaly table, GeoJSON, an anomaly map, and provenance.

HONESTY NOTE: station anomalies are point values. Any mapped surface between
stations is an *estimate* from the available network, not an observation
everywhere — the map is labeled accordingly.

Run:
    python run_pipeline.py --baseline 2011 2020 --period 2021 2021 --month 6
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from weather_geo import climate, validation
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
DEFAULT_INPUT = HERE.parent.parent / "sample-data" / "observations" / "ghcn_monthly_sample.csv"
REQUIRED = ["station_id", "longitude", "latitude", "year", "month", "tavg_c"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    ap.add_argument("--live", action="store_true", help="fetch live NCEI GHCN-Daily data")
    ap.add_argument("--baseline", type=int, nargs=2, default=(2011, 2020), metavar=("LO", "HI"))
    ap.add_argument("--period", type=int, nargs=2, default=(2021, 2021), metavar=("LO", "HI"))
    ap.add_argument("--month", type=int, default=6)
    ap.add_argument("--value-col", default="tavg_c")
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    meta = RunMetadata(workflow="09-climate-anomaly")
    meta.parameters = {
        "baseline": list(args.baseline),
        "period": list(args.period),
        "month": args.month,
        "value_col": args.value_col,
    }

    if args.live:
        from weather_geo.acquire import ghcn

        raw = ghcn.fetch_monthly(args.month)
        meta.add_source("NCEI GHCN-Daily (live)", uri=ghcn.BASE, stations=ghcn.IOWA_GHCN)
        if raw.empty:
            raise SystemExit("live GHCN returned no data")
    else:
        meta.add_source("bundled sample (GHCN-style monthly)", uri=args.input.as_uri())
        raw = pd.read_csv(args.input)

    report = validation.validate_observations(raw, REQUIRED, timestamp_col=None)
    if not report.ok:
        raise SystemExit(f"missing required columns: {report.missing_columns}")

    df = raw[raw["month"] == args.month].copy()
    if df.empty:
        raise SystemExit(f"no data for month {args.month}")

    anomalies = climate.period_anomaly(df, tuple(args.baseline), tuple(args.period), args.value_col)
    anomalies = climate.attach_station_coords(anomalies, df)

    thin = anomalies[anomalies["n_baseline_years"].fillna(0) < 5]
    if len(thin):
        meta.warn(
            f"{len(thin)} station(s) had fewer than 5 baseline years; "
            "their normals are less reliable"
        )
    missing = anomalies[anomalies["anomaly"].isna()]
    if len(missing):
        meta.warn(f"{len(missing)} station(s) missing period or baseline data (anomaly = NaN)")

    table_path = args.output / "station_anomalies.csv"
    anomalies.to_csv(table_path, index=False)

    valid = anomalies.dropna(subset=["anomaly"])
    summary = {
        "n_stations": int(anomalies["station_id"].nunique()),
        "n_with_anomaly": int(len(valid)),
        "mean_anomaly": round(float(valid["anomaly"].mean()), 3) if len(valid) else None,
        "max_anomaly": round(float(valid["anomaly"].max()), 3) if len(valid) else None,
        "min_anomaly": round(float(valid["anomaly"].min()), 3) if len(valid) else None,
    }
    (args.output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    try:
        from weather_geo import plotting, vector

        gdf = vector.points_from_dataframe(valid)
        gdf.to_file(args.output / "station_anomalies.geojson", driver="GeoJSON")
        plotting.scatter_map(
            valid,
            "longitude",
            "latitude",
            "anomaly",
            f"{args.value_col} departure from {args.baseline[0]}-{args.baseline[1]} normal "
            f"(month {args.month}) — station estimates",
            args.output / "anomaly_map.png",
        )
    except Exception as exc:  # pragma: no cover
        meta.warn(f"geojson/map skipped: {exc}")

    meta.write(args.output / "processing.json")
    print(
        f"[ok] {summary['n_with_anomaly']} station anomalies; "
        f"mean {summary['mean_anomaly']}. Outputs in {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
