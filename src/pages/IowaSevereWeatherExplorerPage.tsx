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
            radar, storm reports, warnings, and surface observations can be read together, while
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

        {/* DATA SOURCES & LIMITATIONS */}
        <section className="swx-section" aria-labelledby="swx-sources-heading">
          <h2 id="swx-sources-heading">Data sources &amp; limitations</h2>
          <p>
            Radar is the Iowa Environmental Mesonet&apos;s archived national NEXRAD base-reflectivity
            composite (N0Q); storm reports, warning polygons, and ASOS/AWOS observations also come
            from the IEM archive. HRRR model fields are byte-range subset from the NOAA HRRR archive
            on AWS, and satellite imagery is GOES-16 ABI Cloud &amp; Moisture Imagery. Post-event
            damage assessments are real NWS survey products — damage points, tornado tracks, and
            damage polygons — from the NOAA Damage Assessment Toolkit (DAT).
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