# Dylan McDermott — Portfolio & Engineering Examples

Meteorologist and geospatial data professional. This repository contains two things:

1. **The portfolio website** — a React + TypeScript single-page site (this root), deployed to GitHub Pages.
2. **[`weather-geospatial/`](weather-geospatial/)** — reproducible, tested example
   workflows that turn authoritative weather data into validated maps, analyses,
   and products, following an **acquire → validate → normalize → analyze → publish**
   pipeline. Each workflow runs offline against small sample data **and** against
   live authoritative sources (NWS/IEM, SPC, NOAA MRMS/HRRR/GOES on S3, NCEI) via
   a `--live` flag — no API keys required.

   | Workflow | Demonstrates |
   |----------|--------------|
   | [Surface observations](weather-geospatial/examples/01-surface-observations/) | ingestion, unit normalization, physical-range QC, geodesic nearest-station |
   | [Severe-weather report ETL](weather-geospatial/examples/02-severe-weather-reports/) | schema validation, event normalization, duplicate reconciliation, point-in-polygon joins |
   | [MRMS radar raster analysis](weather-geospatial/examples/03-mrms-radar-analysis/) | raster metadata, clip/reproject, Cloud Optimized GeoTIFF, zonal statistics |
   | [Report → station matching](weather-geospatial/examples/04-report-station-matching/) | spatial + temporal joins, geodesic nearest-neighbor, evidence output |
   | [GPS field-sensor processing](weather-geospatial/examples/05-gps-field-sensor/) | GPS QC, inward-buffer edge filtering in equal-area CRS, plot aggregation |
   | [Multi-source event package](weather-geospatial/examples/06-multi-source-event/) | orchestration, partial-failure handling, multi-source provenance, packaging |
   | [HRRR model processing](weather-geospatial/examples/07-hrrr-model-processing/) | xarray NWP fields, derived variables, grid sampling, model-vs-obs residuals |
   | [GOES-GLM aggregation](weather-geospatial/examples/08-goes-glm-aggregation/) | object-storage discovery, defensive download logic, point-to-grid density |
   | [Climate anomaly mapping](weather-geospatial/examples/09-climate-anomaly/) | baseline normals, departure-from-normal, multi-year series, gap handling |

   See the [`weather-geospatial/` README](weather-geospatial/README.md) for the
   full package, tests, and planned additions.

---

## Portfolio website

A simple one-page React and TypeScript portfolio designed for GitHub Pages.

## Run locally

```powershell
npm install
npm run dev
```

Open the local address shown by Vite, usually `http://localhost:5173`.

## Customize the content

Most visible text is stored in one file:

```text
src/data/portfolio.ts
```

Edit that file to change your biography, links, projects, experience, research, and skills.

The main layout is in:

```text
src/App.tsx
```

The visual design is in:

```text
src/index.css
```

## Add your résumé

Place your PDF here:

```text
public/resume.pdf
```

The Résumé link will then work automatically.

## Deploy from the existing McDermott_Portfolio repository

The included `vite.config.ts` is already configured for:

```text
https://dylanmcd16.github.io/McDermott_Portfolio/
```

Push the files to the `main` branch, then on GitHub:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and confirm the deployment succeeds.

Every later push to `main` will redeploy the site.

## Use the shorter dylanmcd16.github.io address

Rename the GitHub repository to:

```text
Dylanmcd16.github.io
```

Then change this line in `vite.config.ts`:

```ts
base: '/McDermott_Portfolio/',
```

to:

```ts
base: '/',
```

The site will then be available at:

```text
https://dylanmcd16.github.io/
```

## Production check

```powershell
npm run build
npm run preview
```

The production files are generated in `dist/`. Do not commit `dist`; GitHub Actions builds it automatically.
