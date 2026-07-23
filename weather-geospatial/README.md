# Meteorological & Geospatial Data Engineering Examples

Reproducible, tested example workflows that turn authoritative weather data into
validated maps, analyses, and products. Every workflow follows the same pattern:

> **acquire → validate → normalize → analyze → publish**

The emphasis is deliberately on the engineering that sits *between* download and
map — schema validation, unit normalization, CRS management, deduplication,
spatial/temporal joins, quality control, and provenance — because that is what
separates an operational pipeline from a mapping tutorial.

Every example runs **offline** against small, deterministic bundled sample data,
so a reviewer can clone the repo and reproduce the outputs without credentials
or large downloads. Every data-driven workflow **also runs against live
authoritative sources** with a `--live` flag (see [Live data](#live-data)).

## Workflow groups

| Group | Workflow | Demonstrates |
|-------|----------|--------------|
| **Meteorological observations** | [01 · Surface observations](examples/01-surface-observations/) | REST/CSV ingestion, unit normalization, physical-range QC, geodesic nearest-station |
| **Climatology** | [09 · Climate anomaly mapping](examples/09-climate-anomaly/) | Baseline normals, departure-from-normal, multi-year time series, gap handling |
| **Geospatial data engineering** | [02 · Severe-weather report ETL](examples/02-severe-weather-reports/) | Schema validation, event/unit normalization, duplicate reconciliation, point-in-polygon joins |
| **Remote sensing** | [03 · MRMS radar raster analysis](examples/03-mrms-radar-analysis/) | Raster metadata, clip/reproject, COG output, per-county zonal statistics |
| **Remote sensing / NWP** | [07 · HRRR model processing](examples/07-hrrr-model-processing/) | Multidimensional xarray, derived variables, grid sampling, model-vs-obs residuals |
| **Remote sensing** | [08 · GOES-GLM aggregation](examples/08-goes-glm-aggregation/) | Object-storage discovery, defensive download logic, point-to-grid density |
| **Geospatial data engineering** | [04 · Report → station matching](examples/04-report-station-matching/) | Spatial + temporal joins, geodesic nearest-neighbor, midnight windows, evidence output |
| **Field sensing** | [05 · GPS field-sensor processing](examples/05-gps-field-sensor/) | GPS QC, metric buffering in equal-area CRS, inward-buffer edge filtering, plot aggregation |
| **Capstone** | [06 · Multi-source event package](examples/06-multi-source-event/) | Orchestration, partial-failure handling, multi-source provenance, vector+raster+tabular packaging |

## Live data

Add `--live` to fetch real data from authoritative public sources. The live
fetchers live in [`weather_geo.acquire`](src/weather_geo/acquire/) and return the
**same schema** as the offline samples, so `--live` and the default path share
all downstream code. Downloads are cached under `data-cache/` (git-ignored);
transient 5xx responses are retried with backoff. No API keys are required.

```bash
pip install -e ".[geo,raster,viz,live]"

python examples/01-surface-observations/run_pipeline.py --live --valid 2025-06-20T18:53
python examples/02-severe-weather-reports/run_pipeline.py --live --date 2025-05-15
python examples/03-mrms-radar-analysis/run_pipeline.py    --live      # latest MRMS QPE
python examples/04-report-station-matching/run_pipeline.py --live --date 2024-05-21
python examples/06-multi-source-event/run_pipeline.py     --live --date 2024-05-21
python examples/07-hrrr-model-processing/run_pipeline.py  --live      # latest HRRR cycle
python examples/08-goes-glm-aggregation/run_pipeline.py   --live --minutes 8
python examples/09-climate-anomaly/run_pipeline.py        --live --baseline 1991 2020 --period 2021 2021
```

| Workflow | Live source | Access | Format |
|----------|-------------|--------|--------|
| 01, 04, 06, 07 | IEM ASOS surface obs | HTTP CSV | CSV |
| 02, 04, 06 | SPC storm reports | HTTP CSV | CSV |
| 03, 06 | MRMS radar QPE (`noaa-mrms-pds`) | anonymous S3 | gzipped GRIB2 |
| 07 | HRRR 10 m winds (`noaa-hrrr-bdp-pds`) | S3 + `.idx` HTTP byte-range | GRIB2 |
| 08 | GOES-19 GLM lightning (`noaa-goes19`) | anonymous S3 | NetCDF |
| 09 | NCEI GHCN-Daily | HTTP CSV | CSV |

Notes: the HRRR fetcher uses the file's `.idx` index to pull **only** the two
10 m-wind GRIB messages (~2 MB) instead of the full ~150 MB file, then regrids
the Lambert subset onto a regular AOI mesh. MRMS/HRRR/GLM are rolling real-time
archives, so `--live` without a date uses the latest available granule/cycle.
Workflow 05 (GPS field-sensor) has no public live source and is synthetic by
design.

## The `weather_geo` package

Reusable, tested utilities the workflows share, under a `src/` layout:

```
src/weather_geo/
├── validation.py   # schema, timestamp, physical-range QC; lon/lat-swap detection
├── units.py        # meteorological unit conversions
├── projections.py  # CRS constants, geodesic (haversine) distance, nearest-point
├── vector.py       # point geometry, record-preserving spatial joins
├── matching.py     # spatial-temporal nearest-observation matching
├── raster.py       # metadata, clip, reproject, zonal statistics
├── model.py        # gridded NWP: derived fields, point sampling
├── aggregation.py  # point-to-grid binning / density
├── climate.py      # baseline normals and departure-from-normal anomalies
├── pipeline.py     # stage orchestration with partial-failure handling
├── plotting.py     # static maps
├── provenance.py   # structured run metadata for reproducible outputs
└── acquire/        # live-data fetchers (spc, asos, ghcn, mrms, hrrr, glm)
```

The heavy geospatial stack is optional. Pure-Python validation/normalization and
its tests run with only `pandas`/`numpy`; vector and raster steps require the
`geo` and `raster` extras and degrade gracefully when absent.

## Quick start

```bash
cd weather-geospatial
pip install -e ".[geo,raster,viz,dev]"      # or: conda env create -f environment.yml

# Each workflow runs with one command and writes to its own outputs/ folder:
python examples/01-surface-observations/run_pipeline.py
python examples/02-severe-weather-reports/run_pipeline.py
python examples/03-mrms-radar-analysis/run_pipeline.py
```

## Engineering standards

```bash
ruff check .
ruff format --check .
pytest                 # 41 tests: QC, units, distance, dedup, matching, orchestration, binning, anomalies, live-parsing
```

Tests concentrate on logic that can silently produce **incorrect** geospatial
results: CRS mismatch, longitude/latitude reversal, out-of-range values,
midnight-crossing temporal windows, spatial joins that lose records, and
duplicate reconciliation. CI runs the same checks on every push
(`.github/workflows/python-ci.yml`).

## Data & attribution

All bundled sample data is small and synthetic (clearly labeled as such) or
derived from public sources. See [`docs/data-sources.md`](docs/data-sources.md).
No proprietary code, data, endpoints, or credentials are included. Products are
labeled by their true meaning — e.g. MRMS radar QPE and MESH are radar-*derived
estimates*, not gauge or hail measurements.
