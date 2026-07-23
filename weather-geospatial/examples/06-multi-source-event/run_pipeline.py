#!/usr/bin/env python
"""Multi-source weather-event package (capstone).

Orchestrates the earlier workflows into a single, self-describing event package
for one date / time window / area of interest. Reuses ``weather_geo`` modules;
each layer is an independent stage so a missing optional input degrades to a
warning instead of failing the whole product.

Pipeline: acquire (many sources) -> validate/normalize each -> integrate ->
          publish one package with unified provenance

Layers combined:
  * severe-weather storm reports        (points, deduplicated, county-tagged)
  * station observations matched to reports (evidence table)
  * MRMS-style precipitation raster + per-county zonal statistics
  * administrative boundaries

Output (deterministic naming under event_package/):
  event_layers.gpkg · storm_reports.parquet · match_evidence.parquet ·
  raster/event_precip.tif · maps/event_overview.png ·
  metadata/{sources.json, processing.json, warnings.json}

Run:
    python run_pipeline.py --date 2025-06-20 \
        --aoi ../../sample-data/boundaries/iowa_counties_sample.geojson
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from weather_geo import raster, validation
from weather_geo.matching import MatchConfig, match_reports_to_observations
from weather_geo.pipeline import Orchestrator
from weather_geo.projections import US_EQUAL_AREA, haversine_km
from weather_geo.provenance import RunMetadata

HERE = Path(__file__).resolve().parent
SAMPLE = HERE.parent.parent / "sample-data"
DEFAULT_REPORTS = SAMPLE / "observations" / "storm_reports_sample.csv"
DEFAULT_OBS = SAMPLE / "observations" / "mesonet_obs_sample.csv"
DEFAULT_AOI = SAMPLE / "boundaries" / "iowa_counties_sample.geojson"


def _dedup(df: pd.DataFrame, km: float = 3.0, minutes: int = 15) -> pd.DataFrame:
    df = df.sort_values("timestamp").reset_index(drop=True)
    keep: list = []
    for _, row in df.iterrows():
        if any(
            k["event_type"] == row["event_type"]
            and abs((row["timestamp"] - k["timestamp"]).total_seconds()) / 60.0 <= minutes
            and haversine_km(row.longitude, row.latitude, k["longitude"], k["latitude"]) <= km
            for k in keep
        ):
            continue
        keep.append(row)
    return pd.DataFrame(keep).reset_index(drop=True)


def _load_points(path: Path, required: list[str]) -> pd.DataFrame:
    df = pd.read_csv(path)
    rep = validation.validate_observations(df, required)
    if not rep.ok:
        raise ValueError(f"{path.name}: missing columns {rep.missing_columns}")
    df["timestamp"] = validation.parse_timestamps(df, "timestamp")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df = df[
        df["timestamp"].notna()
        & df["longitude"].between(-180, 180)
        & df["latitude"].between(-90, 90)
    ]
    return df.reset_index(drop=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--date", default="2025-06-20")
    ap.add_argument("--reports", type=Path, default=DEFAULT_REPORTS)
    ap.add_argument("--observations", type=Path, default=DEFAULT_OBS)
    ap.add_argument("--aoi", type=Path, default=DEFAULT_AOI)
    ap.add_argument("--live", action="store_true", help="assemble from live SPC/ASOS/MRMS sources")
    ap.add_argument("--output", type=Path, default=HERE / "outputs")
    args = ap.parse_args()

    pkg = args.output / "event_package"
    (pkg / "raster").mkdir(parents=True, exist_ok=True)
    (pkg / "maps").mkdir(parents=True, exist_ok=True)
    (pkg / "metadata").mkdir(parents=True, exist_ok=True)

    orch = Orchestrator()
    meta = RunMetadata(workflow="06-multi-source-event")
    meta.parameters = {"date": args.date, "aoi": str(args.aoi), "live": args.live}

    import geopandas as gpd

    from weather_geo import vector

    # --- Required layers -------------------------------------------------
    boundaries = orch.run("boundaries", lambda: gpd.read_file(args.aoi), required=True)
    meta.add_source("administrative boundaries", uri=args.aoi.as_uri())

    def _reports():
        if args.live:
            from datetime import datetime

            from weather_geo.acquire import spc

            day = datetime.fromisoformat(args.date).date()
            df = spc.fetch_storm_reports(day)
            df = df.dropna(subset=["timestamp", "longitude", "latitude"])
            meta.add_source(
                "SPC storm reports (live)", uri=spc.BASE, convective_day=day.isoformat()
            )
            return _dedup(df.assign(event_type=df["event_type"].astype(str).str.lower()))
        out = _dedup(
            _load_points(
                args.reports, ["report_id", "event_type", "timestamp", "longitude", "latitude"]
            ).assign(event_type=lambda d: d["event_type"].astype(str).str.lower())
        )
        meta.add_source("severe-weather storm reports", uri=args.reports.as_uri())
        return out

    reports = orch.run("storm_reports", _reports, required=True)

    report_points = vector.points_from_dataframe(reports)
    report_points = vector.assign_boundary(report_points, boundaries, ["county", "state"])

    # --- Optional layers (degrade gracefully) ---------------------------
    def _match():
        if args.live:
            from datetime import datetime, timedelta, timezone

            from weather_geo.acquire import asos

            day = datetime.fromisoformat(args.date).date()
            start = datetime(day.year, day.month, day.day, 12, tzinfo=timezone.utc)
            obs = asos.fetch_timeseries(start, start + timedelta(hours=24))
            meta.add_source("IEM ASOS observations (live)", uri=asos.ENDPOINT)
        else:
            obs = _load_points(
                args.observations, ["station_id", "timestamp", "longitude", "latitude", "value"]
            )
            meta.add_source("station observations", uri=args.observations.as_uri())
        return match_reports_to_observations(reports, obs, MatchConfig())

    matches = orch.run("station_matching", _match, fallback=pd.DataFrame())

    def _raster():
        if args.live:
            from weather_geo.acquire import mrms

            da = mrms.fetch_grid()
            meta.add_source(
                "MRMS radar QPE (live S3)",
                uri="s3://noaa-mrms-pds",
                granule=da.attrs.get("source_granule"),
            )
        else:
            da = raster.synthetic_precip_grid()
            meta.add_source(
                "MRMS-style precipitation (radar-derived estimate stand-in)",
                uri="generated:weather_geo.raster.synthetic_precip_grid",
            )
        clipped = raster.clip_to_geometry(da, boundaries.geometry.values, boundaries.crs)
        reproj = raster.reproject(clipped, US_EQUAL_AREA)
        stats = raster.zonal_statistics(reproj, boundaries, "county")
        try:
            reproj.rio.to_raster(pkg / "raster" / "event_precip.tif", driver="COG")
        except Exception:
            reproj.rio.to_raster(pkg / "raster" / "event_precip.tif", driver="GTiff")
        return reproj, stats

    raster_result = orch.run("precip_raster", _raster, fallback=(None, pd.DataFrame()))
    reproj, zonal = raster_result

    # --- Integrate + publish --------------------------------------------
    def _write_gpkg():
        report_points.to_file(pkg / "event_layers.gpkg", layer="storm_reports", driver="GPKG")
        boundaries.to_file(pkg / "event_layers.gpkg", layer="boundaries", driver="GPKG")

    orch.run("write_gpkg", _write_gpkg)
    orch.run("reports_parquet", lambda: reports.to_parquet(pkg / "storm_reports.parquet"))
    if len(matches):
        orch.run("evidence_parquet", lambda: matches.to_parquet(pkg / "match_evidence.parquet"))
    if len(zonal):
        orch.run(
            "zonal_csv",
            lambda: zonal.to_csv(pkg / "county_precip_statistics.csv", index=False),
        )

    def _overview_map():
        from weather_geo import plotting

        if reproj is not None:
            plotting.raster_map(
                reproj,
                f"Event overview {args.date}",
                pkg / "maps" / "event_overview.png",
                boundaries=boundaries,
            )
        else:
            plotting.scatter_map(
                reports,
                "longitude",
                "latitude",
                None,
                f"Event overview {args.date}",
                pkg / "maps" / "event_overview.png",
                boundaries=boundaries,
            )

    orch.run("overview_map", _overview_map)

    # --- Metadata --------------------------------------------------------
    for w in orch.warnings:
        meta.warn(w)
    (pkg / "metadata" / "sources.json").write_text(
        json.dumps(meta.sources, indent=2), encoding="utf-8"
    )
    (pkg / "metadata" / "warnings.json").write_text(
        json.dumps({"warnings": orch.warnings, "stages": orch.summary()}, indent=2),
        encoding="utf-8",
    )
    meta.parameters["orchestration"] = orch.summary()
    meta.parameters["counts"] = {
        "reports": int(len(reports)),
        "matched": int((matches.get("match_status") == "matched").sum()) if len(matches) else 0,
        "zones": int(len(zonal)),
    }
    meta.write(pkg / "metadata" / "processing.json")

    s = orch.summary()
    print(f"[ok] event package -> {pkg}  ({s['n_ok']} stages ok, {s['n_failed']} skipped)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
