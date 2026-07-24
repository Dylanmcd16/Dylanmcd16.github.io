import { DerechoExplorer } from '../components/severe-weather-explorer/DerechoExplorer'
import { BeforeAfterSlider } from '../components/severe-weather-explorer/BeforeAfterSlider'
import { assetUrl } from '../lib/severe-weather/assetUrl'
import '../index.css'
import '../styles/severe-weather-explorer.css'

const base = import.meta.env.BASE_URL
const githubUrl = 'https://github.com/Dylanmcd16'

export function IowaSevereWeatherExplorerPage() {
  return (
    <main className="case-study-page swx-page">
      <div className="container case-study-container">
        <a className="text-link case-study-back" href={base}>
          ← Back to portfolio
        </a>

        {/* HERO */}
        <p className="project-kind">Independent project · Meteorology &amp; geospatial engineering</p>
        <h1 className="swx-page__title">Iowa Severe Weather Data Explorer</h1>
        <p className="case-study-overview">
          An end-to-end meteorological and geospatial engineering demonstration combining radar,
          surface observations, numerical weather prediction, satellite imagery, storm reports,
          warnings, and post-event damage analysis. This is independent work, not part of any
          employer&apos;s systems.
        </p>

        {/* EVENT INTRODUCTION */}
        <section className="swx-section" aria-labelledby="swx-event-heading">
          <h2 id="swx-event-heading">The August 10, 2020 derecho</h2>
          <p>
            On August 10, 2020, a fast-moving derecho crossed Iowa, producing widespread
            100+ mph winds, extensive crop and structural damage, and prolonged power outages.
            The replay below reconstructs the event on one canonical five-minute timeline so that
            radar, storm reports, warnings, and surface observations can be read together — while
            each dataset keeps its own true valid time.
          </p>
          <p className="swx-note">
            <strong>Real archived data.</strong> Every layer below is processed from public
            archives for the peak central- and eastern-Iowa crossing (11:30&nbsp;AM–1:00&nbsp;PM
            CDT): a five-minute NEXRAD reflectivity replay, IEM storm reports and warning polygons,
            ASOS/AWOS surface observations, HRRR model fields from the 12Z cycle, and GOES-16
            satellite imagery — all synchronized to one timeline, each keeping its own valid time.
          </p>
        </section>

        {/* MAIN MAP */}
        <section className="swx-section swx-section--wide" aria-labelledby="swx-map-heading">
          <h2 id="swx-map-heading">Derecho replay — radar &amp; storm reports</h2>
          <DerechoExplorer />
        </section>

        {/* DATA PIPELINE */}
        <section className="swx-section" aria-labelledby="swx-pipeline-heading">
          <h2 id="swx-pipeline-heading">How the data pipeline works</h2>
          <p>
            The browser never parses raw scientific formats. An offline Python pipeline converts
            Level II radar, GRIB2 model output, and archived observations into compact static web
            assets — transparent WebP rasters plus GeoJSON — and emits a single manifest and
            timeline the React app loads. Everything is synchronized to five-minute frames, and
            each frame records the actual source scan or observation time.
          </p>
          <ul className="swx-pipeline">
            <li>
              <span className="swx-pipeline__step">Acquire</span>
              Pull archived NEXRAD volumes, IEM observations, HRRR cycles, and GOES imagery.
            </li>
            <li>
              <span className="swx-pipeline__step">Process</span>
              Crop the national NEXRAD reflectivity composite, reproject HRRR and GOES onto the
              Iowa grid, and match each observation to its nearest frame.
            </li>
            <li>
              <span className="swx-pipeline__step">Validate</span>
              Fail the build on gaps: non-sequential frames, missing rasters, or out-of-domain
              coordinates.
            </li>
            <li>
              <span className="swx-pipeline__step">Publish</span>
              Write a manifest, a timeline, and GeoJSON that the app filters by time in the browser.
            </li>
          </ul>
        </section>

        {/* GREENFIELD BEFORE/AFTER */}
        <section className="swx-section" aria-labelledby="swx-greenfield-heading">
          <h2 id="swx-greenfield-heading">Greenfield tornado damage comparison</h2>
          <p>
            A separate demonstration, and a different event. On May 21, 2024, a violent tornado
            struck Greenfield, Iowa. Drag the divider to compare Sentinel-2 imagery from before and
            after — the post-event scene shows the damage scar cutting through town.
          </p>
          <BeforeAfterSlider
            beforeSrc={assetUrl('data/iowa-severe-weather/greenfield/before.webp')}
            afterSrc={assetUrl('data/iowa-severe-weather/greenfield/after.webp')}
            beforeLabel="May 18, 2024 — before"
            afterLabel="May 23, 2024 — after"
            alt="Sentinel-2 imagery of Greenfield, Iowa"
          />
          <p className="swx-caption">
            Imagery: Copernicus Sentinel-2 L2A natural color. The comparison shows how remotely
            sensed data can support post-event damage identification and geospatial assessment.
          </p>
        </section>

        {/* ENGINEERING DECISIONS */}
        <section className="swx-section" aria-labelledby="swx-decisions-heading">
          <h2 id="swx-decisions-heading">Engineering decisions &amp; data quality</h2>
          <ul className="swx-decisions">
            <li>
              <strong>Honest timing.</strong> A radar scan, a satellite image, and a station
              observation near the same frame are never presented as simultaneous — each carries its
              own valid time.
            </li>
            <li>
              <strong>Missing data is shown, not hidden.</strong> Frames with no acceptable source
              fall back to a transparent raster; stale observations are flagged rather than carried
              forward.
            </li>
            <li>
              <strong>No false precision.</strong> The first version plots station observations
              directly instead of interpolating a smooth surface a sparse network cannot support.
            </li>
            <li>
              <strong>Contemporaneous vs. post-event.</strong> Damage surveys and estimated wind
              swaths are off by default and clearly labeled as post-event analysis.
            </li>
            <li>
              <strong>Constrained navigation.</strong> The map is locked to Iowa: the user can zoom
              in and pan within a small buffer, but cannot zoom out past the statewide view.
            </li>
          </ul>
        </section>

        {/* DATA SOURCES & LIMITATIONS */}
        <section className="swx-section" aria-labelledby="swx-sources-heading">
          <h2 id="swx-sources-heading">Data sources &amp; limitations</h2>
          <p>
            Radar is the Iowa Environmental Mesonet&apos;s archived national NEXRAD base-reflectivity
            composite (N0Q); storm reports, warning polygons, and ASOS/AWOS observations also come
            from the IEM archive. HRRR model fields are byte-range subset from the NOAA HRRR archive
            on AWS, and satellite imagery is GOES-16 ABI Cloud &amp; Moisture Imagery. The estimated
            wind-impact swath is derived from the full storm-report set after the event.
          </p>
          <p className="swx-note">
            Direct per-site NEXRAD Level II is blocked for anonymous access in some networks, so
            this build uses the national composite rather than a hand-built multi-radar mosaic. The
            IEM also experienced an outage during this derecho, so the station pipeline inspects
            completeness rather than assuming every timestamp is present.
          </p>
        </section>

        {/* SOURCE CODE */}
        <section className="swx-section" aria-labelledby="swx-source-heading">
          <h2 id="swx-source-heading">Source code</h2>
          <p>
            The frontend and the Python processing pipeline are open source.{' '}
            <a className="text-link" href={githubUrl} target="_blank" rel="noreferrer">
              View the code on GitHub ↗
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
