import { SeasonExplorer } from '../components/soybean-season-explorer/SeasonExplorer'
import { CaseStudyFooter } from '../components/CaseStudyFooter'
import '../index.css'
import '../styles/soybean-season-explorer.css'

const base = import.meta.env.BASE_URL

/** The datasets behind the map, named so a reader can go and find them. */
const SOURCES = [
  { name: 'USDA Crop Sequence Boundaries', use: 'for field shapes' },
  { name: 'USDA Cropland Data Layer', use: 'to identify 2025 soybean fields' },
  { name: 'Sentinel-2 L2A', use: 'imagery for NDVI' },
  { name: 'NOAA MRMS', use: 'for hourly precipitation' },
  { name: 'USDA SSURGO', use: 'for soil information' },
]

/** Four things this page is careful not to claim, given one heading each so
 * the limits are as easy to find as the results. */
const NOT_CLAIMED = [
  {
    title: 'NDVI is not canopy cover',
    body: [
      'NDVI measures vegetation greenness. It is not canopy cover, leaf area, yield, or crop health.',
      'No canopy percentage is estimated here.',
    ],
  },
  {
    title: 'These are estimated field units',
    body: [
      'USDA Crop Sequence Boundaries are satellite-derived field estimates.',
      'They are not property boundaries, FSA records, or ownership parcels.',
    ],
  },
  {
    title: 'Rainfall is estimated',
    body: [
      'MRMS combines radar and gauge information to estimate precipitation.',
      'It is not the same as having a rain gauge in each field, and most fields only intersect a few MRMS grid cells.',
    ],
  },
  {
    title: 'This is descriptive',
    body: [
      'The map shows greenness and rainfall on the same timeline.',
      'It does not claim rainfall caused changes in NDVI, rank fields, estimate planting dates, or fit a predictive model.',
    ],
  },
]

export function IowaSoybeanSeasonExplorerPage() {
  return (
    <main className="sse-page">
      <div className="sse-shell">
        <a className="sse-back" href={base}>
          ← Portfolio
        </a>
      </div>

      <header className="sse-hero">
        <p className="sse-hero__eyebrow">Independent project · Agriscience &amp; remote sensing</p>
        <h1 className="sse-hero__title">A soybean season, one satellite pass at a time.</h1>
        <p className="sse-hero__lead">
          See how soybean greenness changed across 248 central Iowa fields in 2025, alongside
          rainfall from MRMS.
        </p>
      </header>

      <SeasonExplorer />

      <div className="sse-shell">
        <section className="sse-section sse-prose" aria-labelledby="sse-read-heading">
          <h2 id="sse-read-heading">How to read the map</h2>
          <p>
            The slider moves between the <strong>59 Sentinel-2 dates with usable imagery</strong>,
            not every calendar day. The spacing reflects the actual time between satellite passes.
          </p>
          <p>
            Clouds block some fields on most dates. Those fields are left hollow rather than filled
            with an old or estimated value.
          </p>
          <p>
            Rainfall runs on the daily calendar underneath the satellite data. MRMS provides hourly
            radar-based precipitation estimates, which are combined into Central Time calendar days.
          </p>
          <p>
            Use <strong>Since 1 May</strong> for seasonal rainfall or <strong>Last 14 days</strong>{' '}
            for recent wet and dry areas.
          </p>
          <p>
            The color scales stay fixed throughout the season so changes from one date to the next
            are directly comparable.
          </p>
        </section>

        <section className="sse-section sse-prose" aria-labelledby="sse-build-heading">
          <h2 id="sse-build-heading">What I built</h2>
          <p>The project combines several public datasets into one interactive map:</p>
          <ul className="sse-list">
            {SOURCES.map((source) => (
              <li key={source.name}>
                <strong>{source.name}</strong> {source.use}
              </li>
            ))}
          </ul>
          <p>
            Fields are included when at least 80% of the area is classified as soybean. Each polygon
            is also buffered inward by 20 m to reduce contamination from roads, ditches, and
            neighboring fields.
          </p>
          <p>
            Sentinel-2 pixels are cloud-masked before NDVI is calculated. The field value is the
            median NDVI from the usable pixels inside each field.
          </p>
          <p>MRMS rainfall is accumulated from hourly estimates into local daily totals.</p>
          <p>
            The final dataset contains <strong>9,769 valid field-level NDVI observations</strong>{' '}
            across the 2025 season.
          </p>
          <p>
            The map is built with MapLibre over satellite imagery, so every field stays in its real
            geographic location.
          </p>
        </section>

        <section className="sse-section" aria-labelledby="sse-notclaimed-heading">
          <div className="sse-prose">
            <h2 id="sse-notclaimed-heading">What this does not claim</h2>
          </div>
          <div className="sse-notes">
            {NOT_CLAIMED.map((note) => (
              <div className="sse-note" key={note.title}>
                <h3>{note.title}</h3>
                {note.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="sse-section sse-prose" aria-labelledby="sse-sources-heading">
          <h2 id="sse-sources-heading">Data sources</h2>
          <p>
            Sentinel-2 L2A surface reflectance (ESA Copernicus, via the Element 84 earth-search
            STAC API over AWS Open Data); USDA NASS Crop Sequence Boundaries and Cropland Data
            Layer; NOAA{' '}
            <a href="https://www.nssl.noaa.gov/projects/mrms/" target="_blank" rel="noreferrer">
              MRMS
            </a>{' '}
            MultiSensor_QPE_01H_Pass2 via the NOAA Open Data bucket <code>noaa-mrms-pds</code>;
            USDA NRCS SSURGO via Soil Data Access. Basemap imagery © Esri, Maxar, and Earthstar
            Geographics; place labels © CARTO and OpenStreetMap contributors.
          </p>
          <p className="sse-footnote">
            Four MRMS grid cells (0.14%) were flagged by QC for a persistent fixed-location
            accumulation artifact and excluded from visualization; original values are retained in
            the processed dataset.
          </p>
        </section>

        <div className="sse-foot sse-prose">
          <CaseStudyFooter
            base={base}
            next={{
              label: 'Iowa Severe Weather Explorer',
              href: `${base}projects/iowa-severe-weather-explorer/`,
            }}
          />
        </div>
      </div>
    </main>
  )
}
