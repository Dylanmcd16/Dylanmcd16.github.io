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
            This is a demonstration of the August 10, 2020 Iowa derecho, where I put together an
            interactive display of NEXRAD radar reflectivity and radial velocity, GOES-16
            satellite imagery (visible, infrared, and sandwich), HRRR model fields (composite
            reflectivity, surface wind gust, 10&nbsp;m wind speed, 2&nbsp;m temperature,
            2&nbsp;m dew point, and MUCAPE), NWS warning polygons, local storm reports, ASOS/AWOS
            surface observations, and NWS damage assessments — built from an archived N0Q
            reflectivity composite, NEXRAD Level&nbsp;II velocity, HRRR GRIB2, and GOES-16 NetCDF,
            and served to the browser as WebP rasters, GeoJSON, and JSON — with layer toggles, a
            time slider, and a start/stop button to play back the event.
          </p>
        </section>

        {/* MAIN MAP */}
        <section className="swx-section" aria-labelledby="swx-map-heading">
          <h2 id="swx-map-heading">Derecho replay experience</h2>
          <DerechoExplorer />
        </section>

        {/* GREENFIELD BEFORE/AFTER */}
        <section className="swx-section" aria-labelledby="swx-greenfield-heading">
          <h2 id="swx-greenfield-heading">Greenfield tornado damage Sentinel-2 imagery comparison</h2>
          <p>
            A separate demonstration, and a different event. On May 21, 2024, a violent tornado
            struck Greenfield, Iowa. Drag the divider to compare **Sentinel-2 imagery** from before and
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