# Iowa Severe Weather Data Explorer — data pipeline

Offline processing that turns archived weather data into the static web assets
consumed by the front-end explorer at `/projects/iowa-severe-weather-explorer/`.

The browser never parses Level II radar, GRIB2, or NetCDF. All scientific data is
converted to compact web assets (transparent WebP rasters + GeoJSON) here, ahead
of deployment, and written to:

```
public/data/iowa-severe-weather/
```

## Status

**Phases 2–6 implemented with real archived data.**

Run the whole pipeline (downloads real data for the configured window and writes
all assets + manifest + timeline, then validates):

```bash
pip install -r requirements.txt   # or: pandas geopandas rasterio xarray netCDF4 cfgrib metpy boto3 requests pyyaml pillow
python run_pipeline.py                       # everything
python run_pipeline.py --only radar hrrr     # a subset
python scripts/process_greenfield.py          # Greenfield before/after (real Sentinel-2)
```

The event window and all parameters live in `config/derecho-2020.yml`. Widen
`timeline.start`/`end` to process more of the derecho.

### Sources (all real, public)

| Layer | Module | Source |
| --- | --- | --- |
| Radar (Phase 2) | `radar.py` | IEM archived national NEXRAD base-reflectivity composite (N0Q), cropped to Iowa |
| Storm reports (Phase 2) | `reports.py` | IEM Local Storm Report (LSR) archive |
| Warnings (Phase 3) | `warnings.py` | IEM storm-based warning polygons (VTEC/SBW) |
| Post-event assessment (Phase 3) | `assessments.py` | Estimated wind swath derived from the full report set + tornado reports |
| Surface obs (Phase 4) | `stations.py` | IEM ASOS/AWOS, nearest-obs per frame + full event series |
| HRRR (Phase 5) | `hrrr.py` | NOAA HRRR archive (AWS), byte-range GRIB2, 6 variables, one fixed 12Z cycle |
| Satellite (Phase 6) | `goes.py` | GOES-16 ABI L2 Cloud & Moisture (AWS), visible / infrared / sandwich |

### Why the national radar composite rather than per-site Level II

The plan calls for a hand-built multi-radar Level II mosaic (KDMX/KDVN/KFSD/KOAX).
Direct anonymous access to the `noaa-nexrad-level2` bucket is blocked in some
networks (including where this was built), so the pipeline uses IEM's archived
national NEXRAD composite instead — real reflectivity at 5-minute cadence on a
fixed EPSG:4326 grid. `metpy.io.Level2File` is available for a true per-site
mosaic wherever Level II access is permitted.

### Phase 1 (mock) — still available

`scripts/generate_mock_assets.py` regenerates the original deterministic mock
dataset (no network) if you want to develop the front-end offline.

## Design rules

- Every source keeps its own valid / observation time; differently-timed datasets
  are never presented as simultaneous.
- Missing data is surfaced (transparent raster / flagged stale obs), never carried
  forward silently.
- No interpolated station surfaces in the first release.
- Post-event products are off by default and never shown as real-time information.
