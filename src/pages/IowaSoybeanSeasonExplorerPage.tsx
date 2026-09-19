import { SeasonExplorer } from '../components/soybean-season-explorer/SeasonExplorer'
import { CaseStudyFooter } from '../components/CaseStudyFooter'
import '../index.css'
import '../styles/soybean-season-explorer.css'

const base = import.meta.env.BASE_URL

/** Four things this page is careful not to claim, given one heading each so
 * the limits are as easy to find as the results. */
const NOT_CLAIMED = [
  {
    title: 'Greenness, not canopy cover',
    body: `NDVI is a vegetation index. It is not canopy cover, leaf area, yield, or crop health,
      and it saturates once a canopy closes — two fully closed fields can read the same while
      differing underneath. No percentage cover is estimated here.`,
  },
  {
    title: 'Estimated field units, not parcels',
    body: `Crop Sequence Boundaries are USDA's satellite-derived estimates of single-crop field
      units. They are not surveyed property boundaries, FSA records, or ownership parcels, and the
      field numbers are internal to this project.`,
  },
  {
    title: 'Sampled rainfall, not gauges',
    body: `Daymet interpolates weather-station records onto a 1 km grid — a modelled estimate, not
      a rain gauge in the field. It is sampled here at 806 latitude/longitude points roughly 1 km
      apart, which are not snapped to Daymet's native projected pixels. The display smooths
      between sample points for legibility; the values themselves are the individual samples.`,
  },
  {
    title: 'No causal claim',
    body: `Greenness and rainfall are shown on one timeline so they can be read together. Nothing
      here says rainfall caused a change in greenness, no field is ranked against another, no
      planting date is estimated, and no model is fitted.`,
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
          How did greenness change across 248 central Iowa fields through 2025, and how did
          rainfall accumulate alongside it? Every colour on this map is something Sentinel-2
          measured on the day it says.
        </p>
      </header>

      <SeasonExplorer />

      <div className="sse-shell">
        <section className="sse-section sse-prose" aria-labelledby="sse-read-heading">
          <h2 id="sse-read-heading">How to read it</h2>
          <p>
            The slider does not move day by day. It steps between the{' '}
            <strong>59 usable Sentinel-2 acquisition dates</strong> in 2025 — out of 214 days in
            the window. The ticks along the track sit at each one&apos;s true position in the
            season, so the uneven spacing of clear views is visible in the control itself. A smooth
            day-by-day animation would imply the crop was watched continuously, and it was not.
          </p>
          <p>
            &ldquo;Usable&rdquo; does not mean cloud-free everywhere. A date qualifies when at
            least one field could be measured on it, and on most of them some fields are still lost
            to cloud — which is why the season yields{' '}
            <strong>9,769 valid field-level NDVI observations</strong> rather than the 248 × 59 =
            14,632 that a cloudless season would have produced. Nothing is interpolated, so a field
            drawn as a hollow outline was clouded out on that date rather than bare.
          </p>
          <p>
            Rainfall runs on the real daily clock underneath. Cumulative totals count from 1 May,
            the conventional start of the Iowa soybean planting window — a stated reference point,
            not an estimated planting date. Switch the overlay to the last 14 days to see recent
            wet and dry patches instead of the season&apos;s running total. Both scales are fixed
            for the whole season, so a colour means the same thing on every frame and the animation
            can be read as change rather than as rescaling.
          </p>
        </section>

        <section className="sse-section sse-prose" aria-labelledby="sse-build-heading">
          <h2 id="sse-build-heading">What I built</h2>
          <p>
            A Python pipeline selects the fields and measures them, and this page draws the result.
            USDA Crop Sequence Boundaries supply candidate field polygons; each is kept only where
            the 2025 Cropland Data Layer says at least 80% of it is soybean, then shrunk 20 m
            inward so roads, ditches, and the neighbouring crop stay out of the signal. Sentinel-2
            L2A scenes are read as windowed cloud-optimised GeoTIFFs straight from AWS, masked per
            pixel with the scene classification layer, and reduced to a median NDVI over each
            field&apos;s interior. Daymet supplies daily rainfall, queried at 806 points on a
            regular latitude/longitude grid roughly 1 km apart, and SSURGO the soil series for each
            field.
          </p>
          <p>
            The result is 9,769 valid field-level NDVI observations across the season. The map is
            MapLibre over Esri World Imagery, with the fields as real georeferenced polygons rather
            than a drawing — zoom in and a field sits on the ground it came from, next to its own
            farmstead and tree lines.
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
                <p>{note.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sse-section sse-prose" aria-labelledby="sse-sources-heading">
          <h2 id="sse-sources-heading">Data sources</h2>
          <p>
            Sentinel-2 L2A surface reflectance (ESA Copernicus, via the Element 84 earth-search
            STAC API over AWS Open Data); USDA NASS Crop Sequence Boundaries and Cropland Data
            Layer; Daymet V4 R1 daily surface weather on a 1 km grid, via the single-pixel
            extraction service (Thornton et al., ORNL DAAC,{' '}
            <a href="https://doi.org/10.3334/ORNLDAAC/2129" target="_blank" rel="noreferrer">
              doi:10.3334/ORNLDAAC/2129
            </a>
            ); USDA NRCS SSURGO via Soil Data Access. Basemap imagery © Esri, Maxar, and Earthstar
            Geographics; place labels © CARTO and OpenStreetMap contributors.
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
