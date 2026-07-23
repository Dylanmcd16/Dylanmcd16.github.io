"""Spatial-temporal nearest-observation matching.

Matching storm reports to the nearest valid station observation is a join in
*both* space and time. The engineering value is in the edge cases:

- a report with no station in range (kept, marked unmatched);
- equally distant stations (deterministic tie-break);
- reports or stations with missing coordinates;
- observations outside the requested time window;
- windows that cross midnight (handled naturally by using tz-aware datetimes).

The function never silently drops a report: every input report appears in the
output with an explicit ``match_status``.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from .projections import haversine_km


@dataclass
class MatchConfig:
    max_distance_km: float = 50.0
    time_window_minutes: float = 30.0


def match_reports_to_observations(
    reports: pd.DataFrame,
    observations: pd.DataFrame,
    config: MatchConfig | None = None,
) -> pd.DataFrame:
    """Match each report to the nearest valid observation in space and time.

    ``reports`` needs columns: report_id, timestamp, longitude, latitude.
    ``observations`` needs: station_id, timestamp, longitude, latitude, value.
    Both ``timestamp`` columns must be tz-aware datetimes.

    Returns one row per input report with the matched station (or nulls) and a
    ``match_status`` of ``matched``, ``no_station_in_range``, or
    ``missing_report_coords``.
    """
    cfg = config or MatchConfig()
    window = pd.Timedelta(minutes=cfg.time_window_minutes)

    obs = observations.dropna(subset=["longitude", "latitude", "timestamp"]).copy()

    rows: list[dict] = []
    for report in reports.itertuples(index=False):
        base = {
            "report_id": report.report_id,
            "report_time": report.timestamp,
            "station_id": None,
            "station_time": None,
            "observed_value": None,
            "distance_km": None,
            "time_difference_minutes": None,
            "match_status": "matched",
        }

        if pd.isna(report.longitude) or pd.isna(report.latitude) or pd.isna(report.timestamp):
            base["match_status"] = "missing_report_coords"
            rows.append(base)
            continue

        # Temporal gate first (cheap), then spatial nearest among survivors.
        in_window = obs[(obs["timestamp"] - report.timestamp).abs() <= window]

        best = None
        for o in in_window.itertuples(index=False):
            d = haversine_km(report.longitude, report.latitude, o.longitude, o.latitude)
            if d > cfg.max_distance_km:
                continue
            dt = abs((o.timestamp - report.timestamp).total_seconds()) / 60.0
            # Deterministic tie-break: nearer distance, then smaller time diff,
            # then station_id, so equally distant stations match reproducibly.
            key = (d, dt, str(o.station_id))
            if best is None or key < best[0]:
                best = (key, o, d, dt)

        if best is None:
            base["match_status"] = "no_station_in_range"
        else:
            _, o, d, dt = best
            base.update(
                station_id=o.station_id,
                station_time=o.timestamp,
                observed_value=o.value,
                distance_km=round(d, 3),
                time_difference_minutes=round(dt, 2),
            )
        rows.append(base)

    return pd.DataFrame(rows)
