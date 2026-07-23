# Data sources & attribution

All workflows run offline against small, deterministic **sample** data committed
under [`sample-data/`](../sample-data/). Every data-driven workflow also has a
`--live` path that fetches from the authoritative source (implemented in
[`weather_geo.acquire`](../src/weather_geo/acquire/)); live downloads are cached
under `data-cache/` (git-ignored) and transient 5xx responses are retried with
backoff. No API keys are required.

| Product | Authority | Live endpoint (implemented) | Access | Used by |
|---------|-----------|------------------------------|--------|---------|
| ASOS surface obs | Iowa Environmental Mesonet | `mesonet.agron.iastate.edu/cgi-bin/request/asos.py` | HTTP CSV | 01, 04, 06, 07 |
| SPC storm reports | NOAA Storm Prediction Center | `spc.noaa.gov/climo/reports/{yymmdd}_rpts_*.csv` | HTTP CSV | 02, 04, 06 |
| MRMS radar QPE (radar-derived) | NOAA NSSL / NCEP | `s3://noaa-mrms-pds` | anonymous S3, gzipped GRIB2 | 03, 06 |
| HRRR model winds | NOAA NCEP | `s3://noaa-hrrr-bdp-pds` + `.idx` byte-range | S3 + HTTP Range, GRIB2 | 07 |
| GOES-19 GLM lightning | NOAA GOES-East | `s3://noaa-goes19/GLM-L2-LCFA` | anonymous S3, NetCDF | 08 |
| GHCN-Daily | NOAA NCEI | `ncei.noaa.gov/.../ghcn-daily/access/{id}.csv` | HTTP CSV | 09 |
| County boundaries | US Census TIGER / NWS | (supply via `--aoi`) | shapefiles/GeoJSON | 02, 03, 06 |
| GPS field-sensor readings | synthetic (generic pattern) | *no public live source* | generated in-script | 05 |
| Research field plots | synthetic (generic pattern) | — | bundled GeoJSON | 05 |

## Provenance

Every run writes a `processing.json` (see `weather_geo.provenance`) recording the
source name and URI, retrieval time, parameters, any warnings, source vs. output
CRS, resampling method, and software versions — so any published product is
traceable back to its inputs.

## What is intentionally excluded

No proprietary code, internal endpoints, company data, credentials, tokens, or
large raw weather files. Examples are rebuilt independently around general,
public engineering patterns.

## Product-meaning notes

- **MRMS radar-only QPE** — radar-*derived estimate* of precipitation, not a gauge.
- **MESH** — radar-*derived* maximum expected hail-size proxy, not an observation.
- Any interpolated surface is an **estimate** from available stations, not a
  measurement everywhere.
