# 04 · Storm-report → station spatial-temporal matching

Match severe-weather reports to the nearest valid station observation in **both
space and time**, producing an evidence table that pairs each report with
supporting (or absent) observational data.

**Pipeline:** `acquire → validate → match (space + time) → diagnose → publish`

```
reports ─┐
         ├─▶ temporal gate (±window)  ─▶ spatial nearest (geodesic, ≤ max_km)
obs   ───┘         │                              │
                   ▼                              ▼
        every report kept, labeled:      deterministic tie-break
        matched / no_station_in_range /  (distance, then Δtime, then id)
        missing_report_coords
                   ▼
        evidence table + connection lines + diagnostics + processing.json
```

## Geospatial concepts

Spatial + temporal joins · geodesic (haversine) nearest-neighbor · time-window
filtering including **midnight-crossing** windows · deterministic tie-breaking ·
missing-data handling · evidence-oriented output (nothing silently dropped).

## Run

> **`--live`** matches real SPC reports against real IEM ASOS observations for a
> day: `python run_pipeline.py --live --date 2024-05-21 --max-distance-km 60`.
> See the repo [Live data](../../README.md#live-data) section.


```bash
python run_pipeline.py --max-distance-km 50 --time-window-min 30
```

## Outputs

`match_evidence.csv` — one row per report:

| column | meaning |
|--------|---------|
| report_id, report_time | the report |
| station_id, station_time, observed_value | the matched observation (or null) |
| distance_km, time_difference_minutes | match quality metrics |
| match_status | `matched` / `no_station_in_range` / `missing_report_coords` |

Also `match_lines.geojson` (report→station lines), `summary.json` (status
counts, median distance/time offset), and `processing.json`.

## Edge cases covered by tests

`tests/test_matching.py` verifies: a report with no station in range (kept),
an observation outside the time window (excluded), a window crossing midnight
(matched), a report with missing coordinates (labeled), and equally distant
stations (deterministic tie-break).

## Limitations

Samples are synthetic. Haversine distance (~0.5% error) is appropriate for
station matching. The temporal gate assumes tz-aware timestamps; naive
timestamps should be localized upstream.
