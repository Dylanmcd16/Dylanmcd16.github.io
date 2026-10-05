import { useEffect, useState } from 'react'
import { CaseStudyFooter } from './CaseStudyFooter'
import { CaseStudyHeroScene, type HeroSceneVariant } from './CaseStudyHeroScene'
import { ESRI_SAG_AWARD_POST_URL } from '../data/portfolio'
import { caseStudyUrl } from '../utils/routes'

type CaseStudyImage = {
  src: string
  width: number
  height: number
  alt: string
  caption: string
  label?: string
  treatment?: 'portrait' | 'smoke'
  // Sends the figure somewhere other than the full-size file, for screenshots
  // whose useful destination is the page they were captured from.
  href?: string
  hrefLabel?: string
}

type CaseStudySection = {
  id: string
  navLabel: string
  eyebrow: string
  title: string
  paragraphs: string[]
  highlight?: string
  bullets?: string[]
  images?: CaseStudyImage[]
  note?: string
  workflow?: { title: string; description: string }[]
  code?: string
}

type ProfessionalCaseStudy = {
  title: string
  role: string
  scene: HeroSceneVariant
  summary: string[]
  challengeTitle: string
  challenge: string
  next: { label: string; slug: string }
  tags: string[]
  sections: CaseStudySection[]
  results: string[]
  tools: Array<{ label: string; values: string }>
}

const caseStudies: Record<string, ProfessionalCaseStudy> = {
  'plrb-weather-systems': {
    title: 'Weather, Catastrophe, & Geospatial Analysis',
    role: 'PLRB — Meteorologist',
    scene: 'plrb',
    summary: [
      'I build and maintain production weather-data systems that turn NOAA, IEM, and other environmental datasets into reliable maps, reports, archives, and claims-facing applications.',
    ],
    challengeTitle: 'Making authoritative weather data useful for claims analysis',
    challenge:
      'PLRB members need fast, reliable weather evidence for claims and catastrophe analysis. NOAA and data providers offer extensive information, but sources can be fragmented, inconsistently formatted, and difficult to connect to an address or insurance workflow. I turn them into clear maps, reports, tables, and GIS services members can use without processing raw data themselves.',
    next: { label: 'Corteva — Field-sensing research', slug: 'corteva-field-sensing' },
    tags: [
      'Meteorological analysis',
      'Python automation',
      'ArcPy',
      'ArcGIS Enterprise',
      'Data quality control',
      'Operational resilience',
      'REST APIs',
    ],
    sections: [
      {
        id: 'operational-pipelines',
        navLabel: 'Data pipelines',
        eyebrow: '01 / Operations',
        title: 'Daily weather-data production',
        paragraphs: [
          'I build and maintain daily workflows for storm reports, data acquisition, SPC outlooks, ArcGIS-ready datasets, email updates, and operational archives. They handle high report volumes; assigning occurrence numbers and reviewing surface analyses remain the main manual steps.',
          'Python and ArcPy retrieve data from NOAA and other providers, validate and reconcile storm reports, standardize hazard fields, match records to locations, generate maps, and produce synchronized exports. The workflows flag missing inputs before dependent products are created. Companion workflows publish to ArcGIS Server and notify the team. My acquisition and processing scripts use shared column names and feed an AWS-hosted ArcGIS Server, making consistent datasets reusable through our APIs and applications.',
        ],
        bullets: [
          'Built reconciliation logic that incorporates late reports without duplicating published records.',
          'Added checks for occurrence numbers and timestamps, duplicate removal, and spatial enrichment of missing city or ZIP fields.',
          'Added input checks to verify required downloads and source files before generating dependent products.',
          'Built workflows that carry analyst edits through to final maps, tables, and exports.',
        ],
        images: [
          {
            src: 'track_map_example.jpg',
            width: 1700,
            height: 2200,
            alt: 'National daily storm-track map generated from automated storm reports',
            caption: 'Daily storm-track output generated from standardized reports, event groupings, and automated ArcPy map production.',
            treatment: 'portrait',
          },
          {
            src: 'severe_outlook_example.jpeg',
            width: 1536,
            height: 1024,
            alt: 'Automated Day 2 severe-weather outlook map',
            caption: 'Recurring SPC outlook imagery retrieved and packaged automatically for operational distribution.',
          },
        ],
      },
      {
        id: 'claims-applications',
        navLabel: 'Claims applications',
        eyebrow: '02 / Applications',
        title: 'Claims-facing weather applications',
        paragraphs: [
          'I build ArcGIS Experience Builder applications for hail, wind, hurricanes, and current weather. They combine reports, warnings, observations, radar products, precipitation, and lightning so claims professionals can investigate a location without handling raw data formats.',
          'I use AI-assisted development to build analysis tools and automate data processing. Where standard widgets fell short, I added custom date filters, layer controls, record generation, map synchronization, and location-specific reports through API integrations.',
        ],
        images: [
          {
            src: 'hail_research_map.png',
            width: 2559,
            height: 1203,
            alt: 'Hail Research ArcGIS Experience Builder application',
            label: 'Hail research application',
            caption: 'Claims-oriented interface combining observed reports, gridded hail estimates, date controls, and evidence popups.',
          },
          {
            src: 'current_weather_map.png',
            width: 1654,
            height: 921,
            alt: 'Current Weather and Forecasts ArcGIS application displaying hurricane guidance',
            label: 'Hurricane event analysis',
            caption: 'Multi-source application combining tropical guidance, radar, warnings, outlooks, precipitation, and observations.',
          },
        ],
      },
      {
        id: 'product-validation',
        navLabel: 'Product validation',
        eyebrow: '03 / Research',
        title: 'Scientific validation of weather products',
        paragraphs: [
          'I evaluate new datasets for scientific reliability and operational value, checking what each variable represents, its spatial and temporal resolution, bias, source, and update behavior.',
          'I compare surface PM2.5 observations with HRRR-Smoke guidance and assess products such as ProbSevere and radar-derived hail estimates. I make clear when modeled or remotely sensed values are estimates rather than direct observations.',
        ],
        images: [
          {
            src: 'smoke_map_example.jpeg',
            width: 1536,
            height: 799,
            alt: 'ArcGIS Pro proof of concept comparing PM2.5 observations with HRRR-Smoke output',
            caption: 'Proof of concept used to test the practical limits of comparing modeled smoke with surface air-quality observations.',
            treatment: 'smoke',
          },
        ],
      },
      {
        id: 'exploratory-rd',
        navLabel: 'Exploratory R&D',
        eyebrow: '04 / Exploration',
        title: 'Exploratory convective-wind modeling',
        paragraphs: [
          'I tested a machine-learning approach that matched observed convective gusts with environmental predictors, then compared estimated and recorded wind speeds. Sparse station coverage and storm-scale variability limited accuracy.',
          'The work clarified where modeled gust estimates can add context and where direct observations and meteorological analysis remain necessary.',
          'This is ongoing, exploratory work.'
        ],
      },
      {
        id: 'tropical-cyclone-tracks',
        navLabel: 'Tropical cyclone tracks',
        eyebrow: '05 / Automation',
        title: 'Automated Tropical Cyclone Track Mapping',
        paragraphs: [
          'I built a Python and ArcPy workflow that turns National Hurricane Center GIS archives into print-ready tropical-cyclone maps. It selects a storm, reads track details, sets the map extent, updates ArcGIS Pro layouts, checks inputs, and exports standard portrait and landscape maps at 300 DPI.',
          'This replaced a repetitive manual process with a reusable mapping workflow.',
        ],
        images: [
          {
            src: '2026_bertha_track.jpg',
            width: 3300,
            height: 2550,
            alt: 'Automated tropical cyclone track map generated from National Hurricane Center GIS archive data',
            caption: 'Track map produced automatically from NHC GIS data, with layout extent, storm metadata, and export handled programmatically.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'esri-sag-award',
        navLabel: 'Esri SAG Award',
        eyebrow: '06 / Recognition',
        title: 'Esri Special Achievement in GIS (SAG) Award',
        paragraphs: [
          'PLRB received Esri’s 2025 Special Achievement in GIS (SAG) Award for innovative GIS work. Esri selects awardees from hundreds of thousands of organizations worldwide.',
          'The award recognized the catastrophe analytics and claims-facing GIS work described here: automated data pipelines, ArcGIS Experience Builder applications, and the services and maps that supply them with validated data. I built and maintain the production workflows and applications as part of PLRB’s Weather & Catastrophe team.',
        ],
        images: [
          {
            src: 'Screenshot 2026-07-17 154353.png',
            width: 502,
            height: 640,
            alt: 'LinkedIn post announcing PLRB’s 2025 Esri Special Achievement in GIS Award',
            caption: 'PLRB’s Weather & Catastrophe team accepting the 2025 Esri SAG Award. Open the announcement on LinkedIn.',
            treatment: 'portrait',
            href: ESRI_SAG_AWARD_POST_URL,
            hrefLabel: 'Read the LinkedIn post announcing PLRB’s 2025 Esri Special Achievement in GIS Award',
          },
        ],
      },
    ],
    results: [
      'Automated recurring maps, archives, alerts, exports, and ArcGIS updates that previously required hours of manual work.',
      'Added validation and reconciliation for late, missing, duplicate, and malformed inputs, including failed downloads.',
      'Built applications that combine weather evidence so claims professionals can review reports, observations, and estimates together.',
      'I work directly with IT on weather-system improvements under PLRB\'s security upgrade plan and verify that the updated workflows function correctly.',
      'Contributed to PLRB’s 2025 Esri SAG recognition.',
    ],
    tools: [
      { label: 'Automation', values: 'Python, ArcPy, scheduled production workflows' },
      { label: 'GIS delivery', values: 'ArcGIS Pro, ArcGIS Server, Experience Builder' },
      { label: 'Data sources', values: 'NOAA, IEM, radar, models, observations, warnings' },
      { label: 'Reliability', values: 'Validation, reconciliation, monitoring, synchronized exports' },
    ],
  },
  'corteva-field-sensing': {
    title: 'Field-Sensing Systems & Geospatial Research',
    role: 'Corteva Agriscience — Field Sensing Research Associate (Contract)',
    scene: 'corteva',
    summary: [
      'I co-developed field-sensing systems and independently built Python and ArcPy workflows that converted high-frequency measurements into quality-controlled, plot-level research data.',
    ],
    challengeTitle: 'Turning field measurements into reliable research data',
    challenge:
      'Field research requires more than collecting measurements. Sensors must work reliably, preserve location data, and produce results researchers can compare across plots, sites, and experiments. I built and operated field systems, then automated the quality checks, mapping, and analysis needed to prepare their data.',
    next: { label: 'Read my M.S. thesis', slug: 'land-use-convective-weather' },
    tags: ['Field sensing', 'Python', 'ArcPy', 'Trimble GPS', 'LiDAR', 'Instrumentation', 'Quality control'],
    sections: [
      {
        id: 'smartstick-platform',
        navLabel: 'Smartstick platform',
        eyebrow: '01 / Field system',
        title: 'Smartstick sensing platform',
        paragraphs: [
          'I co-developed Corteva\'s Smartstick, a wheeled platform that recorded crop-canopy conditions in experimental rows, and operated it throughout the season. Infrared thermometer (IRT) sensors measured canopy temperature, while photosynthetically active radiation (PAR) sensors measured light at different canopy levels. Thermocouples and other sensors also measured temperature within and above the canopy.',
          'An onboard computer recorded each observation with a timestamp and Trimble GPS coordinate. I designed the sensor placement, field procedures, and downstream analysis system; the enclosure\'s internal logging and cloud-transfer implementation were handled by others.',
        ],
        bullets: [
          'Collected thousands of GPS-referenced measurements per walk.',
          'Conducted repeated field collections across the research season.',
          'I led coordination with teams in Puerto Rico, Texas, and Chile, reviewing sensor setups and measurement data and guiding changes to standardize collection methods across sites.',
        ],
        images: [
          {
            src: 'smartstick.jpeg',
            width: 1536,
            height: 1152,
            alt: 'Corteva Smartstick mobile field-sensing platform',
            label: 'Field collection setup',
            caption: 'Mobile platform with IRT and PAR sensors for canopy temperature and light measurements, recorded with GPS and timestamps.',
          },
          {
            src: 'enclosure.jpeg',
            width: 1152,
            height: 1536,
            alt: 'Smartstick onboard electronics and data-acquisition enclosure',
            label: 'Onboard acquisition',
            caption: 'Computer, controls, and sensor electronics integrated into the field platform.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'smartstick-pipeline',
        navLabel: 'Smartstick pipeline',
        eyebrow: '02 / Data system',
        title: 'Automated geospatial processing and analysis',
        paragraphs: [
          'I independently built the Python and ArcPy pipeline that turned each collection’s raw files into research-ready data. It standardized records, plotted them for quality control, removed unrealistic readings, bad GPS positions, and outliers, then matched valid points to each plot, treatment, and genotype.',
          'ArcPy used plot boundaries and inward buffers to exclude observations outside plots or near their edges. The workflow generated point layers, shapefiles, plot summaries, maps, and tables, reducing processing from about one hour to five minutes per collection. I developed the processing proof of concept in approximately one week using Python, ArcPy, and AI-assisted coding.',
        ],
        bullets: [
          'I trained teammates to use the pipeline and incorporated their feedback to improve usability before handoff, allowing the team to run the code independently after I left.',
          'Overlaid measurements on drone imagery for spatial review.',
          'Compared LiDAR-derived canopy structure with ground measurements and crop-stress response.',
          'Compared Smartstick measurements with treatment and crop-stress observations to assess relationships.',
        ],
        workflow: [
          { title: 'Validate observations', description: 'Standardize raw files and review sensor values, timestamps, outliers, and GPS positions.' },
          { title: 'Assign plots', description: 'Map valid GPS points to experimental plots, using inward buffers to exclude edge observations.' },
          { title: 'Summarize measurements', description: 'Produce plot-level tables, maps, and geospatial outputs for research review.' },
          { title: 'Compare evidence', description: 'Review spatial patterns alongside drone imagery, LiDAR, and crop-stress observations.' },
        ],
        images: [
          {
            src: 'field_plot_ex.png',
            width: 1337,
            height: 1176,
            alt: 'Illustrative field plots with GPS-tagged Smartstick measurement points',
            caption: 'Illustrative workflow: GPS-tagged observations converted to points and assigned to buffered experimental plots.',
          },
          {
            src: 'field_plot_data.png',
            width: 1337,
            height: 1177,
            alt: 'Illustrative plot-level analysis values derived from field measurements',
            caption: 'Illustrative plot-level summaries used to compare spatial patterns across an experiment.',
          },
        ],
        note: 'These explanatory illustrations do not contain Corteva data or depict a Corteva field.',
      },
      {
        id: 'crop-water-use',
        navLabel: 'Crop water use',
        eyebrow: '03 / Analysis',
        title: 'Crop water-use and stress analysis',
        paragraphs: [
          'I combined soil moisture, evapotranspiration, irrigation, crop stage, and field data to estimate water use and assess crop stress. I checked for gaps and sensor problems, then interpreted results with agronomists, engineers, and data scientists.',
        ],
      },
      {
        id: 'nitrous-oxide',
        navLabel: 'N₂O experiment',
        eyebrow: '04 / Experimentation',
        title: 'Automated N₂O chamber system',
        paragraphs: [
          'I co-designed and built a 16-chamber automated soil-gas system, including its wiring, tubing, controls, and code. It sampled every 15 minutes for four months, so equipment failures could compromise long stretches of data.',
          'I operated and monitored the system daily, maintained it, and troubleshot equipment issues. Working with my research team and data scientists, I assessed measurement quality, analyzed nitrous oxide data, and interpreted the research findings.',
        ],
        images: [
          {
            src: 'gas_sampling_build.jpeg',
            width: 1152,
            height: 1536,
            alt: 'Multi-channel soil-gas sampling and valve-control system under construction',
            caption: 'In-house valve-control and sampling system carrying chamber air to an on-site analyzer.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'weather-station',
        navLabel: 'Weather station',
        eyebrow: '05 / Instrumentation',
        title: 'Gold Standard instrument-comparison site',
        paragraphs: [
          'I co-designed and built the "Gold Standard" weather station to compare weather instruments and measure how much similar systems differ. It included nine rain gauges, four anemometers, four temperature sensors, infrared sensors, and instruments from vendors such as Davis.',
          'A data logger sent observations by radio to the research building. I maintained the station and helped make its measurements available through a web-based visualization site.',
        ],
        images: [
          {
            src: 'gold_standard_field.jpeg',
            width: 1536,
            height: 1152,
            alt: 'Gold Standard weather station at Corteva field demonstration plots',
            caption: 'Reference site supporting side-by-side comparisons of precipitation, wind, temperature, and infrared measurements.',
          },
          {
            src: 'gold_standard.jpeg',
            width: 1179,
            height: 1487,
            alt: 'Dylan McDermott on site during assembly of the reference weather station',
            caption: 'On site during assembly of the sensor mast, logging enclosures, and radio-linked acquisition system.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'irt-fleet',
        navLabel: 'IRT fleet',
        eyebrow: '06 / Fleet operations',
        title: 'Infrared-radiometer fleet tracking',
        paragraphs: [
          'I built, maintained, shipped, and supported more than 200 infrared radiometers deployed across the Midwest, California, Texas, and South America.',
          'I created dashboards tracking serial numbers, calibration, locations, shipping, repairs, notes, and data status so the team could see which instruments were available or needed maintenance.',
        ],
        images: [
          {
            src: 'infrared-applications.jpg',
            width: 700,
            height: 368,
            alt: 'Infrared radiometer used for crop-canopy temperature measurements',
            caption: 'Infrared radiometers built and maintained for distributed crop-canopy research.',
          },
          {
            src: 'field_plot_2.png',
            width: 1335,
            height: 1178,
            alt: 'Illustrative field map with green and red instrument-status markers',
            caption: 'Illustrative fleet view showing operational placements and units requiring follow-up; no Corteva data is shown.',
          },
        ],
      },
    ],
    results: [
      'Built the Smartstick processing proof of concept in approximately one week and reduced processing from about one hour to five minutes per collection across seven research sites.',
      'Converted thousands of timestamped, GPS-tagged readings into validated plot-level datasets and maps.',
      'Applied one reproducible workflow across seven research sites and compared selected results with drone imagery and LiDAR.',
      'Co-designed and built automated soil-gas and reference weather-station systems, then maintained and debugged them during field deployment.',
      'Created centralized tracking for more than 200 distributed infrared radiometers.',
    ],
    tools: [
      { label: 'Sensing', values: 'IRT and PAR sensors, thermocouples, air-temperature sensors, automated gas chambers' },
      { label: 'Geospatial processing', values: 'Python, ArcPy, Trimble GPS, spatial joins, plot buffers' },
      { label: 'Research outputs', values: 'Points, shapefiles, maps, tables, plot summaries' },
      { label: 'Comparison data', values: 'Drone imagery, LiDAR, experimental treatments, crop-stress response' },
    ],
  },
}

function SectionMedia({ images, base }: { images: CaseStudyImage[]; base: string }) {
  return (
    <div className={`case-media-grid ${images.length === 1 ? 'is-single' : ''}`}>
      {images.map((image) => (
        <figure className={`case-media ${image.treatment ? `case-media--${image.treatment}` : ''}`} key={image.src}>
          <a
            href={image.href ?? `${base}${image.src}`}
            target="_blank"
            rel="noreferrer"
            aria-label={image.hrefLabel ?? `${image.alt} - open full size`}
          >
            <img src={`${base}${image.src}`} alt={image.alt} width={image.width} height={image.height} loading="lazy" />
          </a>
          <figcaption>
            {image.label && <strong>{image.label}</strong>}
            {image.label && ' - '}
            {image.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

export function ProfessionalCaseStudyPage({ slug, base }: { slug: string; base: string }) {
  const study = caseStudies[slug]
  const [activeSection, setActiveSection] = useState(study.sections[0].id)

  useEffect(() => {
    const sections = study.sections
      .map((section) => document.getElementById(section.id))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-22% 0px -58% 0px', threshold: [0, 0.15, 0.4] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [study])

  return (
    <main className={`case-study-page professional-case-study professional-case-study--${slug}`} id="case-top">
      <div className="container professional-case-container">
        <a className="text-link case-study-back" href={base}>Back to portfolio</a>

        <header className="case-hero">
          <CaseStudyHeroScene variant={study.scene} />

          <div className="case-hero-copy">
            <p className="project-kind">{study.role}</p>
            <h1>{study.title}</h1>
            <div className="case-hero-summary">
              {study.summary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <ul className="tech-list" aria-label="Case study technologies">
              {study.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          </div>
        </header>

        <aside className="case-challenge" aria-labelledby="case-challenge-title">
          <p className="case-kicker">The challenge</p>
          <h2 id="case-challenge-title">{study.challengeTitle}</h2>
          <p>{study.challenge}</p>
        </aside>

        <nav className="case-section-nav" aria-label="Case study sections">
          <span>On this page</span>
          <div>
            {study.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={activeSection === section.id ? 'is-active' : ''}
                aria-current={activeSection === section.id ? 'location' : undefined}
              >
                {section.navLabel}
              </a>
            ))}
          </div>
        </nav>

        <div className="case-section-list">
          {study.sections.map((section) => (
            <section className="case-work-section" id={section.id} key={section.id}>
              <div className="case-section-copy">
                <p className="case-kicker">{section.eyebrow}</p>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.highlight &&<p className="case-highlight"><strong>Highlighted contribution</strong>{section.highlight}</p>}
                {section.bullets && (
                  <ul className="case-bullets">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </div>

              {section.workflow && (
                <ol className="case-workflow" aria-label="Processing workflow">
                  {section.workflow.map((step) => (
                    <li key={step.title}><h3>{step.title}</h3><p>{step.description}</p></li>
                  ))}
                </ol>
              )}
              {section.images && <SectionMedia images={section.images} base={base} />}
              {section.note && <p className="case-media-note">{section.note}</p>}
              {section.code && (
                <details className="case-code">
                  <summary>View example ArcPy workflow excerpt</summary>
                  <p className="case-code-note">
                    Site names, file paths, and proprietary implementation details have been replaced or omitted.
                  </p>
                  <pre><code>{section.code}</code></pre>
                </details>
              )}
              <a className="case-back-top" href="#case-top">Back to top</a>
            </section>
          ))}
        </div>

        <section className="case-results" aria-labelledby="case-results-title">
          <div>
            <p className="case-kicker">Outcome</p>
            <h2 id="case-results-title">Results and impact</h2>
          </div>
          <ul>
            {study.results.map((result) => <li key={result}>{result}</li>)}
          </ul>
        </section>

        <section className="case-toolkit" aria-labelledby="case-toolkit-title">
          <p className="case-kicker">Technical toolkit</p>
          <h2 id="case-toolkit-title">Tools and methods</h2>
          <dl>
            {study.tools.map((tool) => (
              <div key={tool.label}>
                <dt>{tool.label}</dt>
                <dd>{tool.values}</dd>
              </div>
            ))}
          </dl>
        </section>

        <CaseStudyFooter
          base={base}
          next={{ label: study.next.label, href: caseStudyUrl(study.next.slug) }}
        />
      </div>
    </main>
  )
}
