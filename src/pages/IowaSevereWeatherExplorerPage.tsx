import { DerechoExplorer } from '../components/severe-weather-explorer/DerechoExplorer'
import { BeforeAfterSlider } from '../components/severe-weather-explorer/BeforeAfterSlider'
import { CaseStudyFooter } from '../components/CaseStudyFooter'
import { assetUrl } from '../lib/severe-weather/assetUrl'
import '../index.css'
import '../styles/severe-weather-explorer.css'

const base = import.meta.env.BASE_URL
const repoUrl = 'https://github.com/Dylanmcd16/Dylanmcd16.github.io'
const pipelineUrl = `${repoUrl}/tree/main/weather-geospatial/examples/iowa-severe-weather-explorer`
const frontendUrl = `${repoUrl}/tree/main/src/components/severe-weather-explorer`

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
          An independent, end-to-end demonstration of meteorology, geospatial engineering, and
          full-stack development: a Python pipeline that pulls seven archived data sources into
          a single reconstructed severe-weather event, and a browser application that replays it.
        </p>

        {/* EVENT INTRODUCTION */}
        <section className="swx-section" aria-labelledby="swx-event-heading">
          <h2 id="swx-event-heading">The August 10, 2020 derecho</h2>
          <p>
            On August 10, 2020, a fast-moving derecho crossed Iowa, producing widespread
            100+ mph winds, extensive crop and structural damage, and prolonged power outages.
            The replay below reconstructs the peak central- and eastern-Iowa crossing
            (11:30&nbsp;AM–1:00&nbsp;PM CDT) on one canonical five-minute timeline, so radar,
            storm reports, warnings, and surface observations can be read together.
          </p>
          <p className="swx-note">
            <strong>Real archived data, honestly timed.</strong> Nothing here is simulated. Each
            source keeps its own true valid or observation time rather than being resampled to
            look simultaneous — a five-minute radar frame, an hourly model field, and a surface
            observation are not the same moment, and the interface does not pretend otherwise.
          </p>
        </section>

        {/* WHAT I BUILT */}
        <section className="swx-section" aria-labelledby="swx-build-heading">
          <h2 id="swx-build-heading">What I built</h2>
          <p>
            The browser never parses Level II radar, GRIB2, or NetCDF. A Python pipeline does all
            of the scientific work ahead of deployment, reprojecting every source onto one Iowa
            display grid, clipping it to the state boundary, and writing compact transparent WebP
            rasters and GeoJSON alongside a manifest and timeline that the front end consumes
            directly. Each source is a separate module, and the orchestrator validates the full
            output set before any of it is served.
          </p>
          <ul className="swx-build-list">
            <li>
              <strong>HRRR without downloading HRRR.</strong> Full GRIB2 files are large and
              mostly irrelevant. The pipeline parses each file&apos;s <code>.idx</code> sidecar to
              locate the six variables it needs, requests only those messages over HTTP byte
              ranges, then reprojects them from the native Lambert-Conformal grid onto the
              display grid.
            </li>
            <li>
              <strong>Reconciling seven clocks.</strong> Radar, warnings, reports, observations,
              model output, and satellite imagery all arrive on different cadences. Each is
              matched to the nearest timeline frame while retaining its real timestamp, so the
              replay stays synchronized without misrepresenting when anything was measured.
            </li>
            <li>
              <strong>Deliberate source choices.</strong> Anonymous access to the Level II bucket
              is blocked on some networks, so reflectivity uses IEM&apos;s archived national N0Q
              composite on a fixed grid. Radial velocity is drawn from a single site rather than
              composited, because velocity is radar-relative and a velocity mosaic is not
              physically meaningful.
            </li>
            <li>
              <strong>Front end.</strong> A React and TypeScript application handling frame
              preloading, playback, layer composition, station popup charts, and a
              before/after imagery comparison, with the map and control logic covered by unit
              tests.
            </li>
          </ul>
        </section>

        {/* MAIN MAP */}
        <section className="swx-section" aria-labelledby="swx-map-heading">
          <h2 id="swx-map-heading">Derecho replay experience</h2>
          <DerechoExplorer />
        </section>

        {/* GREENFIELD BEFORE/AFTER */}
        <section className="swx-section" aria-labelledby="swx-greenfield-heading">
          <h2 id="swx-greenfield-heading">Greenfield tornado damage comparison</h2>
          <p>
            A separate demonstration, and a different event. On May 21, 2024, a violent tornado
            struck Greenfield, Iowa. Drag the divider to compare Sentinel-2 imagery from before and
            after. The post-event scene shows the damage scar cutting through town.
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

        {/* DATA SOURCES & LIMITATIONS */}
        <section className="swx-section" aria-labelledby="swx-sources-heading">
          <h2 id="swx-sources-heading">Data sources &amp; limitations</h2>
          <p>
            Radar is the Iowa Environmental Mesonet&apos;s archived national NEXRAD base-reflectivity
            composite (N0Q); storm reports, warning polygons, and ASOS/AWOS observations also come
            from the IEM archive. HRRR model fields are byte-range subset from the NOAA HRRR archive
            on AWS, and satellite imagery is GOES-16 ABI Cloud &amp; Moisture Imagery. Post-event
            damage assessments are real NWS survey products. Damage points, tornado tracks, and
            damage polygons from the NOAA Damage Assessment Toolkit (DAT).
          </p>
        </section>

        {/* SOURCE CODE */}
        <section className="swx-section" aria-labelledby="swx-source-heading">
          <h2 id="swx-source-heading">Source code</h2>
          <p>
            Both halves are open source. The pipeline includes its own README covering the
            processing phases, configuration, and the reasoning behind each source choice.
          </p>
          <p className="swx-source-links">
            <a className="text-link" href={pipelineUrl} target="_blank" rel="noreferrer">
              Python data pipeline ↗
            </a>
            <a className="text-link" href={frontendUrl} target="_blank" rel="noreferrer">
              React front end ↗
            </a>
          </p>
        </section>

        <CaseStudyFooter
          base={base}
          next={{ label: 'PLRB — production weather systems', href: `${base}work/plrb-weather-systems/` }}
        />
      </div>
    </main>
  )
}