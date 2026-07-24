Now we want to keep the same design elements from the rest of the website but now include these example work pieces.

[![A derecho debrief: Not even a scientist/storm chaser expected the August 10 storm - News Service](https://images.openai.com/static-rsc-4/HVFaLIKoN-S2bGNshThisI-_BuOhiDnCULbQUhF3EaHYBuVIOLfTAk6RalCbMz1EgOZXGC4hFhHlCGcrgpte0wUG8n5KHJDo1Qdqfj7nllGmQHuOEJarSWgbgsiDr-YW2l1tfqUJKrMtAFUKEx4ybY59o2SKTh9m3uq6lbqgKDw?purpose=inline)](https://www.news.iastate.edu/news/derecho-debrief-not-even-scientiststorm-chaser-expected-august-10-storm?utm_source=chatgpt.com)

This should become one coherent project page:

# Iowa Severe Weather Data Explorer

The page would contain two related demonstrations:

1. **August 10, 2020 Derecho Replay** — the main semi-interactive MapLibre application.
2. **Greenfield Tornado Before/After** — a fixed imagery comparison slider below the main map.

The Greenfield comparison should not be mixed into the derecho timeline. They are different events and demonstrate different capabilities.

One correction: **KDSM is the Des Moines airport observation station. The Des Moines WSR-88D radar is KDMX.** The initial radar set would therefore be KFSD, KDMX, and KDVN. I would also test KOAX because it may provide better low-level coverage over parts of western Iowa than KFSD alone.

## 1. Main map concept

The initial view would show Iowa and a narrow buffer around the state.

The user could:

* Zoom into Iowa.
* Pan within the permitted region.
* Reset the map to the statewide extent.
* Not zoom farther out than the initial Iowa view.
* Not pan the map away from Iowa.

MapLibre supports geographic bounds and minimum zoom restrictions, so this can be enforced rather than treated as a visual suggestion. It also supports time sliders, raster sources, and animated sequences of images. ([MapLibre][1])

The default map would open in:

> **Derecho Replay — Radar + Storm Reports**

The radar animation would run automatically while new reports and active polygons appear at the appropriate times.

## 2. Page layout

The project route should be:

```text
/projects/iowa-severe-weather-explorer/
```

The page layout should be:

```text
Hero
↓
Event introduction
↓
Main Iowa derecho map
↓
Brief explanation of the data pipeline
↓
Greenfield before/after imagery slider
↓
Engineering decisions and data quality
↓
Data sources and limitations
↓
GitHub source-code link
```

The homepage would include one featured-project card after your professional and research work:

> **Iowa Severe Weather Data Explorer**
> An end-to-end meteorological data pipeline combining radar, observations, model output, satellite imagery, storm reports, and post-event damage analysis.

This remains independent work rather than being presented as part of PLRB.

# Main derecho map

## 3. Primary map modes

There should be only one main geospatial view. The user changes what the map displays through a primary-mode control.

```text
Radar | Surface Observations | HRRR | Satellite
```

Only one primary meteorological field would be active at a time, except that satellite could optionally serve as the background beneath radar.

Separate overlays would remain available:

```text
Storm Reports
NWS Warnings
Damage Assessments
Tornado Tracks
Cities and Counties
```

This is better than giving every dataset its own independent map. It keeps the interface understandable and demonstrates that all datasets have been synchronized to one common timeline.

## 4. Master timeline

Use one canonical five-minute timeline for the application.

A provisional event window would be approximately:

```text
August 10, 2020
8:30 AM–3:30 PM CDT
13:30–20:30 UTC
```

That would produce approximately 85 five-minute frames, including both endpoints. The final start and end times should be selected only after inspecting actual radar, satellite, report, and station coverage.

NCEI provides archived NEXRAD data and historical five-minute reflectivity products, while the NWS event summary already contains radar, satellite, storm-report, tornado, wind-estimate, and event-timing references for this derecho. ([NCEI][2])

Each timeline record would resemble:

```json
{
  "frameId": 37,
  "validTimeUtc": "2020-08-10T17:35:00Z",
  "displayTime": "12:35 PM CDT",
  "radarFrame": "radar/20200810_1735.webp",
  "satelliteFrame": "satellite/20200810_1736.webp",
  "stationSnapshot": "stations/20200810_1735.geojson",
  "activeWarnings": "warnings/20200810_1735.geojson",
  "newReports": ["report_104", "report_105"],
  "accumulatedReportCount": 106,
  "hrrrValidTime": "2020-08-10T18:00:00Z"
}
```

Each source must retain its actual observation or valid time. We should never imply that a 17:36 satellite image, 17:34 radar scan, and 17:35 station observation are exactly simultaneous.

## 5. Playback controls

The bottom timeline bar should contain:

```text
[Restart] [Previous] [Play/Pause] [Next]
8:30 AM ━━━━━━━━━●━━━━━━━━━ 3:30 PM
Speed: 0.5× | 1× | 2×
12:35 PM CDT
```

Playback behavior:

* One five-minute meteorological frame every 500–800 milliseconds at normal speed.
* Pause when the user drags the timeline.
* Allow exact previous/next-frame stepping.
* Preload the next two or three raster frames.
* Show the actual source time in the legend.
* Do not interpolate between missing frames.
* Flag missing data rather than silently substituting an unrelated timestamp.

# Radar replay

## 6. Radar data and processing

The final radar product should be a single Iowa-wide mosaic generated from:

```text
KFSD — Sioux Falls
KDMX — Des Moines
KDVN — Davenport
Possible addition: KOAX — Omaha
```

The NEXRAD Level II archive is publicly available. The former AWS Level II bucket was deprecated in 2025, so the pipeline should use the current `unidata-nexrad-level2` archive or NCEI access rather than building against the retired location. ([Open Data on AWS][3])

The offline Python pipeline would:

1. Find all radar volumes covering the event.
2. Read Level II reflectivity.
3. Apply basic gate filtering and remove invalid data.
4. Select the lowest useful elevation scan.
5. Transform each radar into a fixed Iowa grid.
6. Resolve overlapping radar coverage.
7. Create one composited reflectivity field per five-minute frame.
8. Render transparent WebP images.
9. Record the scan time and contributing radar sites.

A simple maximum-value mosaic can produce misleading overlap artifacts because distant radars may sample much higher parts of the storm. The preferable method is to prioritize the lowest available beam height, or use a distance/beam-height-aware merge.

Each radar frame should have metadata such as:

```json
{
  "targetTime": "2020-08-10T17:35:00Z",
  "contributingSites": [
    {
      "site": "KDMX",
      "scanTime": "2020-08-10T17:34:41Z"
    },
    {
      "site": "KDVN",
      "scanTime": "2020-08-10T17:36:02Z"
    }
  ],
  "missingSites": ["KFSD"],
  "product": "lowest-elevation reflectivity",
  "units": "dBZ"
}
```

The browser should not process raw radar files. Python would create compact web assets ahead of time. MapLibre can update a georeferenced image source as the timeline changes, and disabling raster fade prevents flashing between frames. ([MapLibre][4])

## 7. Radar presentation

The default presentation would include:

* Dark neutral basemap.
* County boundaries.
* Major Iowa cities.
* Transparent radar reflectivity.
* Active warning polygons.
* Accumulated storm reports.
* Current time and reflectivity legend.

The radar opacity control should be available but restrained:

```text
Radar opacity: 70%
```

A satellite background could appear below the radar, but the user should not be forced to use it.

# Storm reports, warnings, and damage data

## 8. Storm report behavior

Storm reports should be driven by event time.

When a new report enters the timeline:

* It pulses or enlarges for two frames.
* It then becomes a normal persistent marker.
* Earlier reports remain visible so the damage trail accumulates.
* Delayed or estimated reports receive a distinct outline.
* Measured gusts and estimated gusts use different symbols.

Suggested symbols:

```text
Measured wind gust       filled circle
Estimated wind gust      outlined circle
Wind damage              damaged-tree symbol
Tornado                   triangle
Hail                      diamond
```

Clicking a report would display:

```text
Event type
Event time
Location
Magnitude
Measured/estimated status
Source
Report remarks
Issuance time
Delayed-report indicator
```

The NWS derecho summary includes detailed local storm reports, measured and estimated gusts, radar-estimated times, source categories, and tornado information. ([National Weather Service][5])

## 9. Warning polygons

Severe Thunderstorm and Tornado Warning polygons should:

* Appear when issued.
* Remain while active.
* Disappear at expiration or cancellation.
* Be drawn beneath storm reports.
* Use low-opacity fills with clearer outlines.
* Open the warning text when clicked.

The Iowa Environmental Mesonet maintains downloadable historical warning geometries and metadata, including VTEC products and storm-based warning polygons. ([Iowa Environmental Mesonet][6])

This will produce more meaningful real-time polygons than post-event damage areas because warnings actually existed during the event.

## 10. Damage assessments

This layer requires careful treatment.

Post-event damage surveys and estimated wind swaths should **not** appear as though they were available in real time. They were developed after the storm.

Use two categories:

### Event-timed features

These may appear during playback:

* Tornado track segments with known start and end times.
* Damage reports with a defensible occurrence time.
* Survey points that can be assigned a documented event time.

### Post-event assessment features

These should appear only when the user enables:

```text
Show post-event assessment
```

These include:

* Final tornado paths.
* Estimated wind swaths.
* Survey-derived damage polygons.
* Satellite-identified crop damage.
* Post-event UAS findings.

The NWS Des Moines page provides downloadable tornado KMZ files and a preliminary estimated-wind KMZ, while also identifying tornado paths found from satellite and UAS surveys. ([National Weather Service][5])

The legend should say:

> Post-event analysis. These features were not available during the live event.

# Surface observation mode

## 11. Station controls

Selecting **Surface Observations** would reveal:

```text
Temperature | Dew Point | Wind | Peak Gust
```

### Temperature and dew point

Display:

* Colored station circles.
* Numeric value labels at higher zoom levels.
* Station identifier in small type.
* Units in °F, with °C available in the popup.
* No interpolated surface in the initial version.

An interpolated field would look attractive but could imply spatial precision unsupported by a sparse station network. The station observations themselves are the stronger and more defensible demonstration.

### Wind

Display:

* Meteorological wind barbs.
* Gust values where available.
* Distinct highlighting for gusts at or above selected thresholds.
* Calm and missing observations handled explicitly.
* Clickable time-series popup.

The popup could show a small graph covering the entire event:

```text
Temperature
Dew point
Sustained wind
Wind gust
Pressure
```

IEM provides scriptable access to archived ASOS/AWOS/METAR observations. The IEM experienced an outage during the derecho and subsequently worked to fill gaps, so the pipeline must inspect station completeness rather than assume every timestamp is present. ([Iowa Environmental Mesonet][7])

## 12. Station timing

For each five-minute map frame:

* Select the nearest observation within a defined tolerance.
* Record the actual observation time.
* Do not carry an observation indefinitely.
* Mark stale observations.
* Remove stations with no valid observation within the tolerance.

A reasonable initial rule:

```text
Preferred observation: within ±3 minutes
Maximum tolerance: ±7 minutes
Stale after: 10 minutes
```

Those values are design parameters and should be tested against the actual archive.

# HRRR mode

## 13. HRRR forecast design

Use a single HRRR initialization cycle rather than combining the newest run available at every hour.

A likely choice would be:

```text
2020-08-10 12Z initialization
Forecast hours covering the Iowa event
```

That creates an honest forecast progression. Mixing 12Z, 13Z, 14Z, and later cycles would make the animation difficult to interpret because changes could result from both forecast evolution and new model initialization.

The HRRR archive includes data back to 2014, so the August 2020 event is covered. ([Open Data on AWS][8])

Initial variable set:

```text
Composite reflectivity
10-meter wind speed
Surface wind gust
2-meter temperature
2-meter dew point
Most-unstable CAPE
```

Possible later additions:

```text
0–3 km storm-relative helicity
0–6 km bulk shear
850-mb wind
Simulated satellite imagery
Precipitation
```

The first version should not expose dozens of variables. Six well-documented fields are enough.

## 14. HRRR timeline behavior

HRRR is hourly while the main timeline is five-minute.

When the selected time is between model valid hours:

* Keep the most recent HRRR valid field displayed.
* Show the exact valid time prominently.
* Do not create artificial five-minute interpolation.
* Display the model cycle and forecast hour.

Example:

```text
HRRR 12Z cycle
Valid 18Z
Forecast hour 6
Map timeline: 12:35 PM CDT
```

The storm-report and warning overlays can still update every five minutes while the HRRR field changes hourly.

# Satellite mode

## 15. GOES imagery

For this 2020 event, use archived GOES-16 imagery. NOAA’s open archive includes historical GOES-16 data. ([Open Data on AWS][9])

A useful initial selection would be:

```text
Visible imagery
Infrared brightness temperature
Visible/infrared sandwich composite
```

The sandwich composite would be the best presentation layer for the derecho progression because it shows both cloud structure and cold cloud tops.

Two display options should exist:

### Satellite mode

Satellite fills the map as the primary raster.

### Radar with satellite background

Satellite is displayed underneath semitransparent radar.

This is visually strong but must retain readable radar colors. The satellite imagery may need to be desaturated or darkened in the composite presentation.

Satellite frames would be matched to the nearest five-minute timeline frame, with their actual scan times shown.

# Greenfield comparison

## 16. Before-and-after slider

The Greenfield imagery should appear below the derecho map as its own section:

# Greenfield Tornado Damage Comparison

This should be a fixed before/after comparison component, not another full navigable weather map.

Structure:

```text
Before image
────────── draggable divider ──────────
After image
```

It should include:

* Perfectly aligned imagery.
* Matching crop and resolution.
* Date label on both images.
* Source attribution.
* A draggable vertical divider.
* Keyboard-accessible controls.
* Mobile touch support.
* Optional tornado path or damage boundary overlay.
* A short explanation of what is visible.

Possible caption:

> Drag the divider to compare the landscape before and after the Greenfield tornado. The imagery demonstrates how remotely sensed data can support post-event damage identification and geospatial assessment.

A small locator inset could show the image footprint within Iowa, but the comparison itself does not need pan or zoom unless the source images are extremely high resolution.

# Technical architecture

## 17. Repository layout

```text
McDermott_portfolio/
├── projects/
│   └── iowa-severe-weather-explorer/
│       └── index.html
│
├── src/
│   ├── pages/
│   │   └── IowaSevereWeatherExplorerPage.tsx
│   │
│   └── components/
│       └── severe-weather-explorer/
│           ├── DerechoMap.tsx
│           ├── PlaybackControls.tsx
│           ├── PrimaryModeSelector.tsx
│           ├── OverlayControls.tsx
│           ├── RadarLayer.tsx
│           ├── SatelliteLayer.tsx
│           ├── HrrrLayer.tsx
│           ├── StationLayer.tsx
│           ├── StormReportLayer.tsx
│           ├── WarningLayer.tsx
│           ├── DamageAssessmentLayer.tsx
│           ├── DynamicLegend.tsx
│           ├── FeaturePopup.tsx
│           └── BeforeAfterSlider.tsx
│
├── public/
│   └── data/
│       └── iowa-severe-weather/
│           ├── event-manifest.json
│           ├── timeline.json
│           ├── radar/
│           ├── satellite/
│           ├── hrrr/
│           ├── stations/
│           ├── reports/
│           ├── warnings/
│           ├── assessments/
│           └── greenfield/
│
└── weather-geospatial/
    └── examples/
        └── iowa-severe-weather-explorer/
            ├── README.md
            ├── pyproject.toml
            ├── config/
            │   └── derecho-2020.yml
            ├── src/
            │   ├── download_nexrad.py
            │   ├── create_radar_mosaic.py
            │   ├── download_goes.py
            │   ├── process_satellite.py
            │   ├── download_hrrr.py
            │   ├── process_hrrr.py
            │   ├── download_stations.py
            │   ├── process_stations.py
            │   ├── process_reports.py
            │   ├── process_warnings.py
            │   ├── process_assessments.py
            │   ├── build_timeline.py
            │   └── publish_web_assets.py
            └── tests/
```

## 18. Generated asset manifest

The React site should load a generated manifest rather than containing hundreds of hard-coded file names.

```json
{
  "event": {
    "id": "20200810-iowa-derecho",
    "title": "August 10, 2020 Iowa Derecho",
    "timezone": "America/Chicago",
    "start": "2020-08-10T13:30:00Z",
    "end": "2020-08-10T20:30:00Z"
  },
  "map": {
    "bounds": [
      [-96.9, 40.25],
      [-90.0, 43.7]
    ],
    "initialCenter": [-93.5, 42.0],
    "initialZoom": 6.3,
    "minimumZoom": 6.3,
    "maximumZoom": 11
  },
  "layers": {
    "radar": true,
    "satellite": true,
    "stations": true,
    "hrrr": true,
    "reports": true,
    "warnings": true,
    "assessments": true
  },
  "timeline": "timeline.json"
}
```

The precise bounds and zoom must be tested at desktop and mobile widths. A single numeric minimum zoom may not fit Iowa equally well on every screen, so the application may need to calculate the minimum zoom from the viewport dimensions.

# Development phases

## Phase 1 — Map shell

Build:

* Iowa-constrained MapLibre map.
* Timeline control.
* Play, pause, next, previous, and reset.
* Dynamic clock.
* Layer and legend framework.
* Empty generated manifest.

No complex weather data yet.

## Phase 2 — Radar and storm reports

Build the core demonstration:

* Radar acquisition.
* Multi-radar mosaic.
* Five-minute web frames.
* Storm-report processing.
* Accumulating reports.
* Report popups.
* Frame synchronization.

At the end of this phase, the project is already publishable.

## Phase 3 — Warnings and damage information

Add:

* Active warning polygons.
* Tornado paths.
* Report-time styling.
* Post-event assessment toggle.
* NWS estimated wind swath.
* Clear contemporaneous versus post-event labeling.

## Phase 4 — Surface observations

Add:

* Temperature.
* Dew point.
* Wind barbs.
* Gusts.
* Station popups.
* Event time-series charts.
* Missing/stale-data handling.

## Phase 5 — HRRR

Add:

* Fixed model cycle.
* Initial six variables.
* Hourly field changes.
* Model-cycle and forecast-hour labels.
* Variable-specific legends.
* HRRR-to-observation comparison in selected station popups.

## Phase 6 — Satellite

Add:

* GOES-16 visible imagery.
* Infrared imagery.
* Sandwich composite.
* Radar-over-satellite mode.
* Opacity control.

## Phase 7 — Greenfield and project documentation

Add:

* Before/after slider.
* Imagery captions.
* Architecture diagram.
* Data provenance.
* Limitations.
* GitHub README.
* Homepage featured-project card.

# Important constraints

The map should not attempt to load raw GRIB2, NetCDF, or Level II radar files in the browser. Those belong in the Python processing pipeline.

The first release should not contain interpolated station surfaces.

Damage-assessment products should not be portrayed as real-time information.

HRRR should use one consistent cycle.

Every layer should display its actual valid or observation time.

The map should reveal missing data rather than silently carrying stale data forward.

The Greenfield comparison should remain separate from the derecho event timeline.

## Recommended first deliverable

The first complete milestone should contain only:

```text
Iowa-constrained map
Five-minute radar replay
Accumulating storm reports
Active warning polygons
Timeline controls
Report popups
```

That is the project’s core. Stations, HRRR, satellite, and Greenfield should be added only after the radar/report synchronization is reliable. Otherwise, this will become five partially working demonstrations rather than one strong full-system project.

[1]: https://maplibre.org/maplibre-gl-js/docs/examples/timeline-animation/?utm_source=chatgpt.com "Create a time slider - MapLibre GL JS"
[2]: https://www.ncei.noaa.gov/nexradinv/index.jsp?utm_source=chatgpt.com "NEXRAD Data Inventory Search | National Centers for Environmental Information"
[3]: https://registry.opendata.aws/noaa-nexrad/?utm_source=chatgpt.com "NEXRAD on AWS - Registry of Open Data on AWS"
[4]: https://maplibre.org/maplibre-gl-js/docs/API/classes/ImageSource/?utm_source=chatgpt.com "ImageSource - MapLibre GL JS"
[5]: https://www.weather.gov/dmx/2020derecho?utm_source=chatgpt.com "August 10, 2020 Derecho"
[6]: https://mesonet.agron.iastate.edu/archive/?utm_source=chatgpt.com "IEM :: Archived Data Resources"
[7]: https://www.mesonet.agron.iastate.edu/request/download.phtml?network=IS__ASOS&utm_source=chatgpt.com "IEM :: Download ASOS/AWOS/METAR Data"
[8]: https://registry.opendata.aws/noaa-hrrr-pds/?utm_source=chatgpt.com "NOAA High-Resolution Rapid Refresh (HRRR) Model - Registry of Open Data on AWS"
[9]: https://registry.opendata.aws/noaa-goes/?utm_source=chatgpt.com "NOAA Geostationary Operational Environmental Satellites (GOES) 16, 17, 18 & 19 - Registry of Open Data on AWS"


PLAN

# Iowa Severe Weather Explorer Implementation Brief

Build a new public technical project inside the existing React/Vite portfolio repository.

The project is an interactive replay of the August 10, 2020 Iowa derecho. It must combine:

* Animated radar imagery
* Storm reports appearing as they occur
* Active NWS warning polygons
* Optional post-event damage-assessment features
* Surface temperature, dew point, wind, and gust observations
* Selectable HRRR variables
* Optional GOES satellite imagery
* A separate Greenfield tornado before/after image comparison

Do not represent post-event damage products as information that was available during the live derecho.

Do not process Level II radar, GRIB2, or NetCDF files in the browser. Python must convert all scientific data into static web assets before deployment.

---

# 1. Public route

Create this route:

```text
/projects/iowa-severe-weather-explorer/
```

Create or update the physical Vite entry point:

```text
projects/
└── iowa-severe-weather-explorer/
    └── index.html
```

Add it to the existing `vite.config.ts` multi-page build configuration.

Example:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        iowaSevereWeatherExplorer: resolve(
          __dirname,
          "projects/iowa-severe-weather-explorer/index.html",
        ),
      },
    },
  },
});
```

Preserve all existing entry points already in the file.

---

# 2. Component structure

Create:

```text
src/
├── pages/
│   └── IowaSevereWeatherExplorerPage.tsx
│
├── components/
│   └── severe-weather-explorer/
│       ├── DerechoExplorer.tsx
│       ├── DerechoMap.tsx
│       ├── PlaybackControls.tsx
│       ├── MeteorologicalLayerControls.tsx
│       ├── StationOverlayControls.tsx
│       ├── OverlayControls.tsx
│       ├── DynamicLegend.tsx
│       ├── EventClock.tsx
│       ├── DataStatusPanel.tsx
│       └── BeforeAfterSlider.tsx
│
├── hooks/
│   └── useEventPlayback.ts
│
├── lib/
│   └── severe-weather/
│       ├── assetUrl.ts
│       ├── mapLayers.ts
│       ├── mapFilters.ts
│       ├── mapTypes.ts
│       └── preloadFrames.ts
│
└── styles/
    └── severe-weather-explorer.css
```

The initial implementation must use mocked local assets. Do not begin downloading historical weather data until the frontend shell is complete and tested.

---

# 3. Static data layout

Use:

```text
public/
└── data/
    └── iowa-severe-weather/
        ├── event-manifest.json
        ├── timeline.json
        ├── reports.geojson
        ├── warnings.geojson
        ├── stations.geojson
        ├── assessments.geojson
        ├── radar/
        ├── satellite/
        ├── hrrr/
        ├── greenfield/
        │   ├── before.webp
        │   └── after.webp
        └── transparent.png
```

Use `import.meta.env.BASE_URL` when constructing asset paths. Do not assume the site is always deployed at `/`.

```ts
export function assetUrl(relativePath: string): string {
  const cleanPath = relativePath.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}
```

---

# 4. TypeScript data contracts

Create `src/lib/severe-weather/mapTypes.ts`.

```ts
export type ImageCoordinates = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

export type HrrrVariable =
  | "composite_reflectivity"
  | "wind_gust"
  | "wind_speed_10m"
  | "temperature_2m"
  | "dewpoint_2m"
  | "mucape";

export type PrimaryWeatherLayer =
  | "radar"
  | "satellite"
  | "hrrr";

export type StationOverlay =
  | "none"
  | "temperature"
  | "dewpoint"
  | "wind"
  | "gust";

export interface RasterFrameReference {
  url: string;
  validTimeUtc: string;
  sourceTimeUtc: string | null;
  coordinates: ImageCoordinates;
  available: boolean;
  statusMessage?: string;
}

export interface HrrrFrameSet {
  cycleTimeUtc: string;
  forecastHour: number;
  variables: Partial<Record<HrrrVariable, RasterFrameReference>>;
}

export interface TimelineFrame {
  index: number;
  validTimeUtc: string;
  displayTimeCentral: string;
  radar: RasterFrameReference | null;
  satellite: RasterFrameReference | null;
  hrrr: HrrrFrameSet | null;
}

export interface EventManifest {
  event: {
    id: string;
    title: string;
    startTimeUtc: string;
    endTimeUtc: string;
    timezone: "America/Chicago";
  };

  map: {
    viewBounds: [[number, number], [number, number]];
    maxBounds: [[number, number], [number, number]];
    maximumZoom: number;
  };

  files: {
    timeline: string;
    reports: string;
    warnings: string;
    stations: string;
    assessments: string;
  };
}
```

---

# 5. Example manifest

Create a small mocked manifest before using real data:

```json
{
  "event": {
    "id": "20200810-iowa-derecho",
    "title": "August 10, 2020 Iowa Derecho",
    "startTimeUtc": "2020-08-10T14:00:00Z",
    "endTimeUtc": "2020-08-10T21:00:00Z",
    "timezone": "America/Chicago"
  },
  "map": {
    "viewBounds": [
      [-96.9, 40.2],
      [-89.9, 43.75]
    ],
    "maxBounds": [
      [-97.4, 39.8],
      [-89.4, 44.1]
    ],
    "maximumZoom": 11
  },
  "files": {
    "timeline": "data/iowa-severe-weather/timeline.json",
    "reports": "data/iowa-severe-weather/reports.geojson",
    "warnings": "data/iowa-severe-weather/warnings.geojson",
    "stations": "data/iowa-severe-weather/stations.geojson",
    "assessments": "data/iowa-severe-weather/assessments.geojson"
  }
}
```

The final exact event time must be based on the processed archive, not hard-coded assumptions.

---

# 6. Constrained Iowa map

Create `DerechoMap.tsx`.

The user must be able to zoom in, but not farther out than the statewide Iowa view. Panning must remain constrained to Iowa and a small surrounding buffer.

```tsx
import { useEffect, useRef } from "react";
import {
  Map,
  NavigationControl,
  type LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface DerechoMapProps {
  viewBounds: LngLatBoundsLike;
  maxBounds: LngLatBoundsLike;
  maximumZoom: number;
  onMapReady: (map: Map) => void;
}

export function DerechoMap({
  viewBounds,
  maxBounds,
  maximumZoom,
  onMapReady,
}: DerechoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      maxBounds,
      maxZoom: maximumZoom,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: true,
    });

    mapRef.current = map;
    map.touchZoomRotate.disableRotation();

    const lockStatewideExtent = () => {
      const camera = map.cameraForBounds(viewBounds, {
        padding: 24,
      });

      if (!camera) {
        return;
      }

      map.setMinZoom(camera.zoom);

      if (map.getZoom() < camera.zoom) {
        map.jumpTo({
          center: camera.center,
          zoom: camera.zoom,
        });
      }
    };

    map.on("load", () => {
      lockStatewideExtent();

      map.fitBounds(viewBounds, {
        padding: 24,
        duration: 0,
      });

      onMapReady(map);
    });

    map.on("resize", lockStatewideExtent);
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [maximumZoom, maxBounds, onMapReady, viewBounds]);

  return <div ref={containerRef} className="derecho-map" />;
}
```

Do not use one fixed `minZoom` number for all devices. Calculate it from the container and Iowa bounds because desktop and mobile map dimensions differ.

---

# 7. Map source and layer initialization

Create `mapLayers.ts`.

Use separate raster sources for satellite, HRRR, and radar so satellite can appear beneath radar.

Layer order must be:

1. Basemap
2. Satellite
3. HRRR
4. Radar
5. Warning fills
6. Warning outlines
7. Damage-assessment polygons
8. Storm reports
9. New-report pulse
10. Station observations
11. Labels

```ts
import type { FeatureCollection, Geometry } from "geojson";
import {
  type GeoJSONSource,
  type ImageSource,
  type Map,
} from "maplibre-gl";
import type { ImageCoordinates } from "./mapTypes";

const EMPTY_COLLECTION: FeatureCollection<Geometry> = {
  type: "FeatureCollection",
  features: [],
};

export function addWeatherSources(
  map: Map,
  transparentImageUrl: string,
  coordinates: ImageCoordinates,
): void {
  map.addSource("satellite-source", {
    type: "image",
    url: transparentImageUrl,
    coordinates,
  });

  map.addSource("hrrr-source", {
    type: "image",
    url: transparentImageUrl,
    coordinates,
  });

  map.addSource("radar-source", {
    type: "image",
    url: transparentImageUrl,
    coordinates,
  });

  map.addSource("reports-source", {
    type: "geojson",
    data: EMPTY_COLLECTION,
    promoteId: "report_id",
  });

  map.addSource("warnings-source", {
    type: "geojson",
    data: EMPTY_COLLECTION,
    promoteId: "warning_id",
  });

  map.addSource("stations-source", {
    type: "geojson",
    data: EMPTY_COLLECTION,
    promoteId: "observation_id",
  });

  map.addSource("assessments-source", {
    type: "geojson",
    data: EMPTY_COLLECTION,
    promoteId: "assessment_id",
  });
}

export function addWeatherLayers(map: Map): void {
  map.addLayer({
    id: "satellite-layer",
    type: "raster",
    source: "satellite-source",
    layout: { visibility: "none" },
    paint: {
      "raster-opacity": 0.7,
      "raster-fade-duration": 0,
    },
  });

  map.addLayer({
    id: "hrrr-layer",
    type: "raster",
    source: "hrrr-source",
    layout: { visibility: "none" },
    paint: {
      "raster-opacity": 0.72,
      "raster-fade-duration": 0,
    },
  });

  map.addLayer({
    id: "radar-layer",
    type: "raster",
    source: "radar-source",
    layout: { visibility: "visible" },
    paint: {
      "raster-opacity": 0.78,
      "raster-fade-duration": 0,
    },
  });

  map.addLayer({
    id: "warning-fill",
    type: "fill",
    source: "warnings-source",
    paint: {
      "fill-color": [
        "match",
        ["get", "phenomena"],
        "TO",
        "#ef4444",
        "SV",
        "#facc15",
        "#f97316",
      ],
      "fill-opacity": 0.12,
    },
  });

  map.addLayer({
    id: "warning-outline",
    type: "line",
    source: "warnings-source",
    paint: {
      "line-color": [
        "match",
        ["get", "phenomena"],
        "TO",
        "#ef4444",
        "SV",
        "#facc15",
        "#f97316",
      ],
      "line-width": 2,
    },
  });

  map.addLayer({
    id: "assessment-fill",
    type: "fill",
    source: "assessments-source",
    layout: { visibility: "none" },
    paint: {
      "fill-color": "#f97316",
      "fill-opacity": 0.18,
    },
  });

  map.addLayer({
    id: "storm-reports",
    type: "circle",
    source: "reports-source",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        4,
        10,
        8,
      ],
      "circle-color": [
        "match",
        ["get", "event_type"],
        "tornado",
        "#ef4444",
        "hail",
        "#22c55e",
        "measured_wind",
        "#3b82f6",
        "wind_damage",
        "#f97316",
        "#a855f7",
      ],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
      "circle-opacity": 0.9,
    },
  });

  map.addLayer({
    id: "new-report-pulse",
    type: "circle",
    source: "reports-source",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6,
        9,
        10,
        15,
      ],
      "circle-color": "rgba(255,255,255,0)",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
      "circle-opacity": 0.8,
    },
  });

  map.addLayer({
    id: "station-points",
    type: "circle",
    source: "stations-source",
    layout: { visibility: "none" },
    paint: {
      "circle-radius": 7,
      "circle-color": "#ffffff",
      "circle-stroke-color": "#111827",
      "circle-stroke-width": 1.5,
    },
  });

  map.addLayer({
    id: "station-labels",
    type: "symbol",
    source: "stations-source",
    layout: {
      visibility: "none",
      "text-field": ["get", "temp_label"],
      "text-size": 12,
      "text-offset": [0, 1.25],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#111827",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });
}

export function updateRasterSource(
  map: Map,
  sourceId: string,
  url: string,
  coordinates: ImageCoordinates,
): void {
  const source = map.getSource(sourceId);

  if (!source || source.type !== "image") {
    return;
  }

  (source as ImageSource).updateImage({
    url,
    coordinates,
  });
}

export async function loadVectorSource(
  map: Map,
  sourceId: string,
  url: string,
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${sourceId}: ${response.status}`);
  }

  const data = await response.json();
  const source = map.getSource(sourceId);

  if (!source || source.type !== "geojson") {
    throw new Error(`GeoJSON source ${sourceId} is unavailable`);
  }

  await (source as GeoJSONSource).setData(data, true);
}
```

The colors above are placeholders. Adjust them to match the portfolio design and standard meteorological expectations.

---

# 8. GeoJSON property contracts

## Storm reports

Every report feature must contain:

```json
{
  "report_id": "unique-stable-id",
  "event_time_ms": 1597078800000,
  "event_time_utc": "2020-08-10T17:00:00Z",
  "event_type": "wind_damage",
  "magnitude": null,
  "magnitude_units": null,
  "measured": false,
  "source": "trained_spotter",
  "location": "Example location",
  "remarks": "Example remarks",
  "delayed_report": false
}
```

## Warning polygons

Every warning feature must contain:

```json
{
  "warning_id": "unique-vtec-id",
  "issued_time_ms": 1597078500000,
  "expires_time_ms": 1597081200000,
  "phenomena": "SV",
  "significance": "W",
  "office": "KDMX",
  "headline": "Severe Thunderstorm Warning"
}
```

## Station observations

Store one feature per station per matched timeline frame:

```json
{
  "observation_id": "KDSM-37",
  "station_id": "KDSM",
  "frame_index": 37,
  "observation_time_ms": 1597078920000,
  "observation_time_utc": "2020-08-10T17:02:00Z",
  "age_minutes": 2,
  "stale": false,
  "temperature_f": 82,
  "dewpoint_f": 71,
  "wind_speed_mph": 24,
  "wind_gust_mph": 41,
  "wind_from_degrees": 250,
  "wind_to_degrees": 70,
  "temp_label": "82°",
  "dewpoint_label": "71°",
  "wind_label": "24",
  "gust_label": "G41"
}
```

Do not calculate formatted labels repeatedly in the browser. Generate them in the Python pipeline.

---

# 9. Timeline filtering

Do not create a separate GeoJSON file for every frame.

Load the reports, warnings, assessments, and station observations once. Use MapLibre filters as the frame changes.

Create `mapFilters.ts`.

```ts
import type { Map } from "maplibre-gl";

const NEW_REPORT_WINDOW_MS = 10 * 60 * 1000;

export function applyTimelineFilters(
  map: Map,
  frameIndex: number,
  validTimeUtc: string,
): void {
  const currentTimeMs = Date.parse(validTimeUtc);

  map.setFilter("storm-reports", [
    "<=",
    ["get", "event_time_ms"],
    currentTimeMs,
  ]);

  map.setFilter("new-report-pulse", [
    "all",
    [
      ">",
      ["get", "event_time_ms"],
      currentTimeMs - NEW_REPORT_WINDOW_MS,
    ],
    [
      "<=",
      ["get", "event_time_ms"],
      currentTimeMs,
    ],
  ]);

  const warningFilter: maplibregl.FilterSpecification = [
    "all",
    [
      "<=",
      ["get", "issued_time_ms"],
      currentTimeMs,
    ],
    [
      ">",
      ["get", "expires_time_ms"],
      currentTimeMs,
    ],
  ];

  map.setFilter("warning-fill", warningFilter);
  map.setFilter("warning-outline", warningFilter);

  const stationFilter: maplibregl.FilterSpecification = [
    "==",
    ["get", "frame_index"],
    frameIndex,
  ];

  map.setFilter("station-points", stationFilter);
  map.setFilter("station-labels", stationFilter);
}
```

Storm reports should accumulate. Warning polygons should appear and disappear according to issuance and expiration. Station observations should show only the snapshot associated with the current frame.

---

# 10. Playback hook

Create `useEventPlayback.ts`.

```ts
import { useCallback, useEffect, useState } from "react";

interface UseEventPlaybackOptions {
  frameCount: number;
  initialFrame?: number;
  millisecondsPerFrame?: number;
}

export function useEventPlayback({
  frameCount,
  initialFrame = 0,
  millisecondsPerFrame = 700,
}: UseEventPlaybackOptions) {
  const [frameIndex, setFrameIndex] = useState(initialFrame);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const lastFrame = Math.max(0, frameCount - 1);

  const next = useCallback(() => {
    setFrameIndex((current) =>
      current >= lastFrame ? 0 : current + 1,
    );
  }, [lastFrame]);

  const previous = useCallback(() => {
    setFrameIndex((current) =>
      current <= 0 ? lastFrame : current - 1,
    );
  }, [lastFrame]);

  const restart = useCallback(() => {
    setFrameIndex(0);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying || frameCount <= 1) {
      return;
    }

    const intervalId = window.setInterval(
      next,
      millisecondsPerFrame / speed,
    );

    return () => window.clearInterval(intervalId);
  }, [
    frameCount,
    isPlaying,
    millisecondsPerFrame,
    next,
    speed,
  ]);

  return {
    frameIndex,
    setFrameIndex,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    next,
    previous,
    restart,
  };
}
```

Playback must pause when the user manually drags the range slider.

---

# 11. Updating the map for a frame

Create a controller function:

```ts
import type { Map } from "maplibre-gl";
import type {
  HrrrVariable,
  TimelineFrame,
} from "./mapTypes";
import { applyTimelineFilters } from "./mapFilters";
import { updateRasterSource } from "./mapLayers";

interface UpdateFrameOptions {
  map: Map;
  frame: TimelineFrame;
  hrrrVariable: HrrrVariable;
  transparentImageUrl: string;
}

export function updateMapForFrame({
  map,
  frame,
  hrrrVariable,
  transparentImageUrl,
}: UpdateFrameOptions): void {
  if (frame.radar?.available) {
    updateRasterSource(
      map,
      "radar-source",
      frame.radar.url,
      frame.radar.coordinates,
    );
  } else {
    updateRasterSource(
      map,
      "radar-source",
      transparentImageUrl,
      frame.radar?.coordinates ?? [
        [-97, 44],
        [-89, 44],
        [-89, 40],
        [-97, 40],
      ],
    );
  }

  if (frame.satellite?.available) {
    updateRasterSource(
      map,
      "satellite-source",
      frame.satellite.url,
      frame.satellite.coordinates,
    );
  }

  const hrrrFrame = frame.hrrr?.variables[hrrrVariable];

  if (hrrrFrame?.available) {
    updateRasterSource(
      map,
      "hrrr-source",
      hrrrFrame.url,
      hrrrFrame.coordinates,
    );
  }

  applyTimelineFilters(
    map,
    frame.index,
    frame.validTimeUtc,
  );
}
```

---

# 12. Raster and station controls

Use this control model:

```ts
interface ExplorerDisplayState {
  primaryLayer: "radar" | "satellite" | "hrrr";
  satelliteUnderRadar: boolean;
  stationOverlay:
    | "none"
    | "temperature"
    | "dewpoint"
    | "wind"
    | "gust";
  hrrrVariable:
    | "composite_reflectivity"
    | "wind_gust"
    | "wind_speed_10m"
    | "temperature_2m"
    | "dewpoint_2m"
    | "mucape";
  showReports: boolean;
  showWarnings: boolean;
  showPostEventAssessments: boolean;
}
```

Rules:

* Radar is the default primary layer.
* Satellite may be displayed beneath radar.
* HRRR is exclusive with radar because both are gridded meteorological fields.
* Station data is an overlay and can appear over radar, satellite, or HRRR.
* Storm reports and warnings remain available in all modes.
* Post-event assessments are off by default.

Visibility helper:

```ts
import type { Map } from "maplibre-gl";

function setVisibility(
  map: Map,
  layerId: string,
  visible: boolean,
): void {
  if (!map.getLayer(layerId)) {
    return;
  }

  map.setLayoutProperty(
    layerId,
    "visibility",
    visible ? "visible" : "none",
  );
}

export function applyDisplayState(
  map: Map,
  state: ExplorerDisplayState,
): void {
  const showRadar = state.primaryLayer === "radar";
  const showSatellite =
    state.primaryLayer === "satellite" ||
    (showRadar && state.satelliteUnderRadar);
  const showHrrr = state.primaryLayer === "hrrr";
  const showStations = state.stationOverlay !== "none";

  setVisibility(map, "radar-layer", showRadar);
  setVisibility(map, "satellite-layer", showSatellite);
  setVisibility(map, "hrrr-layer", showHrrr);

  setVisibility(map, "storm-reports", state.showReports);
  setVisibility(map, "new-report-pulse", state.showReports);

  setVisibility(map, "warning-fill", state.showWarnings);
  setVisibility(map, "warning-outline", state.showWarnings);

  setVisibility(
    map,
    "assessment-fill",
    state.showPostEventAssessments,
  );

  setVisibility(map, "station-points", showStations);
  setVisibility(map, "station-labels", showStations);
}
```

---

# 13. Station styling

Change station styling when the selected station variable changes.

```ts
import type { Map } from "maplibre-gl";
import type { StationOverlay } from "./mapTypes";

export function applyStationOverlay(
  map: Map,
  overlay: StationOverlay,
): void {
  if (overlay === "none") {
    return;
  }

  const fieldByOverlay = {
    temperature: "temperature_f",
    dewpoint: "dewpoint_f",
    wind: "wind_speed_mph",
    gust: "wind_gust_mph",
  } as const;

  const labelByOverlay = {
    temperature: "temp_label",
    dewpoint: "dewpoint_label",
    wind: "wind_label",
    gust: "gust_label",
  } as const;

  const field = fieldByOverlay[overlay];
  const label = labelByOverlay[overlay];

  map.setLayoutProperty(
    "station-labels",
    "text-field",
    ["get", label],
  );

  if (overlay === "temperature") {
    map.setPaintProperty("station-points", "circle-color", [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", field], 70],
      60,
      "#2563eb",
      70,
      "#22c55e",
      80,
      "#facc15",
      90,
      "#ef4444",
    ]);
  }

  if (overlay === "dewpoint") {
    map.setPaintProperty("station-points", "circle-color", [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", field], 55],
      40,
      "#dbeafe",
      55,
      "#60a5fa",
      65,
      "#22c55e",
      75,
      "#166534",
    ]);
  }

  if (overlay === "wind" || overlay === "gust") {
    map.setPaintProperty("station-points", "circle-color", [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", field], 0],
      0,
      "#e5e7eb",
      20,
      "#facc15",
      40,
      "#f97316",
      60,
      "#dc2626",
      80,
      "#7e22ce",
    ]);
  }
}
```

For the first version, use station circles and labels. Add true meteorological wind barbs only after the rest of the application is stable.

---

# 14. Frame preloading

Preload only a few nearby images. Do not preload the entire event at startup.

```ts
import type {
  HrrrVariable,
  TimelineFrame,
} from "./mapTypes";

export function preloadUpcomingFrames(
  frames: TimelineFrame[],
  currentIndex: number,
  hrrrVariable: HrrrVariable,
  count = 3,
): void {
  const urls = new Set<string>();

  for (
    let index = currentIndex + 1;
    index <= Math.min(currentIndex + count, frames.length - 1);
    index += 1
  ) {
    const frame = frames[index];

    if (frame.radar?.available) {
      urls.add(frame.radar.url);
    }

    if (frame.satellite?.available) {
      urls.add(frame.satellite.url);
    }

    const hrrr = frame.hrrr?.variables[hrrrVariable];

    if (hrrr?.available) {
      urls.add(hrrr.url);
    }
  }

  for (const url of urls) {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  }
}
```

---

# 15. Greenfield before/after component

The Greenfield comparison belongs below the derecho explorer as a separate section.

Create `BeforeAfterSlider.tsx`.

```tsx
import { useState } from "react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
  alt: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  alt,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);

  return (
    <figure className="comparison">
      <div className="comparison__viewport">
        <img
          className="comparison__image"
          src={beforeSrc}
          alt={`${alt}, before`}
        />

        <div
          className="comparison__after"
          style={{
            clipPath: `inset(0 ${100 - position}% 0 0)`,
          }}
        >
          <img
            className="comparison__image"
            src={afterSrc}
            alt={`${alt}, after`}
          />
        </div>

        <div
          className="comparison__divider"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        />

        <span className="comparison__label comparison__label--before">
          {beforeLabel}
        </span>

        <span className="comparison__label comparison__label--after">
          {afterLabel}
        </span>

        <input
          className="comparison__range"
          type="range"
          min={0}
          max={100}
          value={position}
          aria-label="Compare imagery before and after the Greenfield tornado"
          onChange={(event) =>
            setPosition(Number(event.target.value))
          }
        />
      </div>
    </figure>
  );
}
```

CSS:

```css
.comparison__viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 18px;
  background: #111827;
}

.comparison__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comparison__after {
  position: absolute;
  inset: 0;
}

.comparison__divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-1px);
  background: white;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 35%);
  pointer-events: none;
}

.comparison__range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: ew-resize;
}

.comparison__label {
  position: absolute;
  top: 16px;
  z-index: 2;
  padding: 6px 10px;
  border-radius: 999px;
  color: white;
  background: rgb(17 24 39 / 80%);
  font-size: 0.8rem;
}

.comparison__label--before {
  left: 16px;
}

.comparison__label--after {
  right: 16px;
}
```

The two images must be aligned to the same geographic extent and dimensions before being added to the website.

---

# 16. Python pipeline structure

Create:

```text
weather-geospatial/
└── examples/
    └── iowa-severe-weather-explorer/
        ├── pyproject.toml
        ├── README.md
        ├── config/
        │   └── derecho-2020.yml
        ├── src/
        │   └── iowa_severe_weather/
        │       ├── models.py
        │       ├── paths.py
        │       ├── build_timeline.py
        │       ├── process_reports.py
        │       ├── process_warnings.py
        │       ├── process_stations.py
        │       ├── process_radar.py
        │       ├── process_hrrr.py
        │       ├── process_satellite.py
        │       └── validate_publish.py
        └── tests/
```

The pipeline output directory must be configurable. Its production value should point to:

```text
public/data/iowa-severe-weather/
```

---

# 17. Timeline builder example

```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class TimedAsset:
    valid_time: datetime
    relative_url: str
    source_time: datetime | None = None


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError("Datetime must be timezone-aware")

    return value.astimezone(timezone.utc)


def generate_frame_times(
    start: datetime,
    end: datetime,
    step: timedelta,
) -> list[datetime]:
    start = ensure_utc(start)
    end = ensure_utc(end)

    if end < start:
        raise ValueError("End time precedes start time")

    if step.total_seconds() <= 0:
        raise ValueError("Timeline step must be positive")

    frames: list[datetime] = []
    current = start

    while current <= end:
        frames.append(current)
        current += step

    return frames


def nearest_asset(
    target: datetime,
    assets: Iterable[TimedAsset],
    tolerance: timedelta,
) -> TimedAsset | None:
    candidates = list(assets)

    if not candidates:
        return None

    nearest = min(
        candidates,
        key=lambda asset: abs(asset.valid_time - target),
    )

    if abs(nearest.valid_time - target) > tolerance:
        return None

    return nearest


def latest_not_after(
    target: datetime,
    assets: Iterable[TimedAsset],
) -> TimedAsset | None:
    valid = [
        asset
        for asset in assets
        if asset.valid_time <= target
    ]

    if not valid:
        return None

    return max(valid, key=lambda asset: asset.valid_time)
```

Use:

* Five-minute canonical timeline frames
* Nearest radar scan within a configurable tolerance
* Nearest satellite scan within a configurable tolerance
* Most recent HRRR valid hour that does not occur after the timeline frame
* Actual source time preserved separately from target frame time

Never invent a raster frame when no acceptable source asset exists.

---

# 18. Station-to-frame matching example

```python
from __future__ import annotations

from datetime import timedelta

import pandas as pd


def assign_station_observations_to_frames(
    observations: pd.DataFrame,
    frame_times: list[pd.Timestamp],
    tolerance: timedelta = timedelta(minutes=7),
) -> pd.DataFrame:
    required = {
        "station_id",
        "valid_time_utc",
        "longitude",
        "latitude",
    }

    missing = required - set(observations.columns)

    if missing:
        raise ValueError(
            f"Missing station columns: {sorted(missing)}"
        )

    data = observations.copy()
    data["valid_time_utc"] = pd.to_datetime(
        data["valid_time_utc"],
        utc=True,
        errors="raise",
    )

    matched_rows: list[pd.Series] = []

    for frame_index, frame_time in enumerate(frame_times):
        frame_time = pd.Timestamp(frame_time).tz_convert("UTC")

        candidate = data.copy()
        candidate["time_delta"] = (
            candidate["valid_time_utc"] - frame_time
        ).abs()

        candidate = candidate[
            candidate["time_delta"] <= tolerance
        ]

        if candidate.empty:
            continue

        nearest = (
            candidate.sort_values(
                ["station_id", "time_delta"]
            )
            .drop_duplicates(
                subset=["station_id"],
                keep="first",
            )
            .copy()
        )

        nearest["frame_index"] = frame_index
        nearest["age_minutes"] = (
            nearest["time_delta"].dt.total_seconds() / 60
        ).round(1)

        matched_rows.extend(
            row for _, row in nearest.iterrows()
        )

    if not matched_rows:
        return pd.DataFrame()

    output = pd.DataFrame(matched_rows)
    output["stale"] = output["age_minutes"] > 5

    output["wind_to_degrees"] = (
        output["wind_from_degrees"] + 180
    ) % 360

    output["temp_label"] = output["temperature_f"].map(
        lambda value: ""
        if pd.isna(value)
        else f"{round(value):.0f}°"
    )

    output["dewpoint_label"] = output["dewpoint_f"].map(
        lambda value: ""
        if pd.isna(value)
        else f"{round(value):.0f}°"
    )

    output["wind_label"] = output["wind_speed_mph"].map(
        lambda value: ""
        if pd.isna(value)
        else f"{round(value):.0f}"
    )

    output["gust_label"] = output["wind_gust_mph"].map(
        lambda value: ""
        if pd.isna(value)
        else f"G{round(value):.0f}"
    )

    return output
```

Do not indefinitely carry observations forward. Missing stations should disappear or be marked unavailable.

---

# 19. HRRR starter example

Use one fixed model cycle for the event.

```python
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from herbie import Herbie


HRRR_SEARCHES = {
    "composite_reflectivity": r":REFC:entire atmosphere",
    "wind_gust": r":GUST:surface",
    "temperature_2m": r":TMP:2 m above ground",
    "dewpoint_2m": r":DPT:2 m above ground",
    "u_wind_10m": r":UGRD:10 m above ground",
    "v_wind_10m": r":VGRD:10 m above ground",
    "mucape": r":CAPE:180-0 mb above ground",
}


def load_hrrr_variable(
    cycle_time: datetime,
    forecast_hour: int,
    variable: str,
):
    if variable not in HRRR_SEARCHES:
        raise ValueError(
            f"Unsupported HRRR variable: {variable}"
        )

    hrrr = Herbie(
        cycle_time,
        model="hrrr",
        product="sfc",
        fxx=forecast_hour,
    )

    dataset = hrrr.xarray(HRRR_SEARCHES[variable])

    return dataset
```

Before finalizing search expressions, inspect the archived inventory and test every variable for the selected 2020 cycle.

Subset the GRIB data before loading unnecessary fields into memory.

For each variable:

1. Extract only the Iowa domain and small buffer.
2. Convert units explicitly.
3. Render a transparent WebP or PNG.
4. Record cycle time, valid time, forecast hour, units, and source field.
5. Use a consistent legend across all valid hours for that variable.

Do not rescale the legend independently for each frame.

---

# 20. Radar processing starter

Use KDMX, KDVN, KFSD, and evaluate whether KOAX should be included.

The first radar implementation should:

1. Read the closest Level II volume from each available site.
2. Keep reflectivity only.
3. Grid all available radars onto one common domain.
4. Produce one fixed-size Iowa raster.
5. Record which radar sites and scan times contributed.
6. Emit missing-site warnings.

Starter—not final scientific implementation:

```python
from __future__ import annotations

from pathlib import Path
from typing import Sequence

import pyart


def grid_nexrad_volumes(
    radar_files: Sequence[Path],
):
    if not radar_files:
        raise ValueError("No radar files were provided")

    radars = []

    for path in radar_files:
        radar = pyart.io.read(
            str(path),
            include_fields=["reflectivity"],
        )

        if "reflectivity" not in radar.fields:
            continue

        radars.append(radar)

    if not radars:
        raise ValueError(
            "No readable reflectivity fields were found"
        )

    grid = pyart.map.grid_from_radars(
        tuple(radars),
        grid_shape=(1, 700, 900),
        grid_limits=(
            (0.0, 1_000.0),
            (-300_000.0, 300_000.0),
            (-450_000.0, 450_000.0),
        ),
        grid_origin=(42.0, -93.5),
        fields=["reflectivity"],
        weighting_function="Barnes2",
        roi_func="dist_beam",
        min_radius=1_000.0,
    )

    return grid
```

This is only the initial gridding mechanism. Before publication, inspect:

* Beam-height effects
* Distant-radar contamination
* Range-folded or invalid values
* Unequal scan times
* Overlap artifacts
* Missing radars
* Whether the lowest usable sweep or a low-level Cartesian grid is the better display

Do not simply take the maximum reflectivity from all sites without documenting the consequences.

The web raster must be reprojected into a map-compatible grid and rendered with a fully transparent background for missing data.

---

# 21. Data validation before publication

Create a script that fails the build if generated data are inconsistent.

Checks must include:

```python
from __future__ import annotations

import json
from pathlib import Path


def validate_timeline(
    timeline_path: Path,
    public_root: Path,
) -> None:
    frames = json.loads(
        timeline_path.read_text(encoding="utf-8")
    )

    if not frames:
        raise ValueError("Timeline contains no frames")

    expected_indices = list(range(len(frames)))
    actual_indices = [frame["index"] for frame in frames]

    if actual_indices != expected_indices:
        raise ValueError(
            "Timeline frame indices are not sequential"
        )

    valid_times = [
        frame["validTimeUtc"] for frame in frames
    ]

    if valid_times != sorted(valid_times):
        raise ValueError(
            "Timeline valid times are not chronological"
        )

    for frame in frames:
        for layer_name in ("radar", "satellite"):
            layer = frame.get(layer_name)

            if not layer or not layer.get("available"):
                continue

            path = public_root / layer["url"]

            if not path.exists():
                raise FileNotFoundError(
                    f"Missing {layer_name} asset: {path}"
                )
```

Also validate:

* Every GeoJSON is a valid FeatureCollection.
* All coordinates are within reasonable Iowa-domain bounds.
* Every report has a unique ID.
* Every warning has issuance before expiration.
* Every station frame index exists in the timeline.
* Every raster has four corner coordinates.
* Every displayed source time falls within its configured tolerance.
* No absolute local filesystem paths appear in public JSON.

---

# 22. Required frontend tests

Use Vitest for units and Playwright for the page.

Unit tests:

* Playback advances one frame.
* Playback wraps to frame zero.
* Previous from frame zero wraps to the final frame.
* Storm-report filter includes all reports through the current time.
* Warning filter includes only currently active warnings.
* Station filter selects the correct frame index.
* Missing raster frames use the transparent image.
* Asset URLs work with a non-root Vite base path.
* Greenfield slider supports keyboard changes.

Playwright tests:

1. Open the project route.
2. Confirm the map loads.
3. Confirm the initial view is Iowa.
4. Attempt to zoom out and verify the map cannot underzoom.
5. Start playback and confirm the clock advances.
6. Confirm report count never decreases.
7. Switch to temperature stations.
8. Switch to HRRR wind gust.
9. Enable satellite beneath radar.
10. Enable post-event assessments and confirm the disclosure appears.
11. Move the Greenfield comparison slider.

---

# 23. Page copy requirements

Use this project title:

```text
Iowa Severe Weather Data Explorer
```

Use this subtitle:

```text
An end-to-end meteorological and geospatial engineering demonstration combining radar, surface observations, numerical weather prediction, satellite imagery, storm reports, warnings, and post-event damage analysis.
```

The page must visibly distinguish:

```text
Event-time information
```

from:

```text
Post-event analysis
```

Include a persistent data-time display showing:

* Map timeline time
* Radar scan time
* Satellite scan time
* Station observation time when selected
* HRRR initialization time
* HRRR forecast hour
* HRRR valid time

Do not describe differently timed datasets as perfectly simultaneous.

---

# 24. Phase-one acceptance criteria

Phase one is complete when:

* The new route builds on GitHub Pages.
* The map is constrained to Iowa.
* Six mocked radar frames play in sequence.
* Mock storm reports accumulate.
* Mock warning polygons appear and expire.
* Playback controls work.
* Raster images change without flashing.
* The page works on desktop and mobile.
* Existing portfolio pages remain unchanged.
* Unit and browser tests pass.

Do not begin real radar processing until all phase-one criteria pass.

---

# 25. Later phases

Proceed in this order:

## Phase two

Replace mocked radar and report data with real processed data.

## Phase three

Add warnings and post-event damage assessments.

## Phase four

Add temperature, dew point, wind, and gust station overlays.

## Phase five

Add the fixed-cycle HRRR variable selector.

## Phase six

Add GOES satellite imagery and radar-over-satellite mode.

## Phase seven

Add the aligned Greenfield before/after comparison and final project documentation. (use the TIFF images at browser_images.zip and browser_images (1).zip in public)