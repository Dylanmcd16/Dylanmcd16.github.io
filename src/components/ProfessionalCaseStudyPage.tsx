import { useEffect, useState } from 'react'

type CaseStudyImage = {
  src: string
  alt: string
  caption: string
  treatment?: 'portrait' | 'smoke'
}

type CaseStudySection = {
  id: string
  navLabel: string
  eyebrow: string
  title: string
  paragraphs: string[]
  bullets?: string[]
  images?: CaseStudyImage[]
  note?: string
  code?: string
}

type ProfessionalCaseStudy = {
  title: string
  role: string
  summary: string[]
  challenge: string
  tags: string[]
  sections: CaseStudySection[]
  results: string[]
  tools: Array<{ label: string; values: string }>
}

const smartstickCode = `def assign_measurements_to_plots(
    sensor_csv: Path,
    plot_boundaries: Path,
) -> gpd.GeoDataFrame:
    measurements = pd.read_csv(sensor_csv)

    points = gpd.GeoDataFrame(
        measurements,
        geometry=gpd.points_from_xy(
            measurements["longitude"],
            measurements["latitude"],
        ),
        crs="EPSG:4326",
    )

    plots = gpd.read_file(plot_boundaries).to_crs(points.crs)

    return gpd.sjoin(
        points,
        plots[["plot_id", "geometry"]],
        how="left",
        predicate="within",
    )`

const caseStudies: Record<string, ProfessionalCaseStudy> = {
  'plrb-weather-systems': {
    title: 'Weather, Catastrophe, & Geospatial Analysis',
    role: 'PLRB - Weather & Catastrophe Analyst',
    summary: [
      'I design and maintain operational weather and geospatial tools that help claims professionals evaluate events and understand complex environmental data.',
      'My work connects meteorology with Python and ArcPy automation, ArcGIS application development, cloud infrastructure, APIs, and research into emerging weather products. The objective is to turn technical datasets into reliable, transparent tools for event verification and catastrophe analysis.',
    ],
    challenge:
      'Claims questions rarely have one perfect data source. Radar, observations, models, satellite products, warnings, and storm reports all differ in format, resolution, timing, and uncertainty. I build repeatable systems that organize those sources and make their limits understandable to non-meteorologists.',
    tags: [
      'Meteorological analysis',
      'Catastrophe research',
      'Spatial analysis',
      'Python automation',
      'ArcPy',
      'ArcGIS Enterprise',
      'Data integration',
      'REST APIs',
    ],
    sections: [
      {
        id: 'operational-pipelines',
        navLabel: 'Data pipelines',
        eyebrow: '01 / Operations',
        title: 'Operational weather-data pipelines',
        paragraphs: [
          'I developed and continue to refine an automated storm-report workflow that collects daily reports, processes delayed submissions, identifies duplicates, standardizes attributes, adds missing geographic information, generates consistent outputs, and publishes results to ArcGIS Server.',
          'The same operational pattern supports recurring severe-weather, precipitation, radar, smoke, evacuation, earthquake, and power-outage products. Python and ArcPy jobs validate expected inputs, organize archives, prepare ArcGIS-ready outputs, update downstream services, and alert the team when data does not arrive as expected. AWS services including EC2, S3, and RDS support backend processing, storage, and application delivery.',
        ],
        bullets: [
          'Reduced manual handling and opportunities for processing errors.',
          'Handled late, missing, and duplicate files without breaking downstream products.',
          'Automated daily storm-track maps and recurring ArcGIS updates.',
          'Connected acquisition, quality control, publishing, monitoring, and cloud delivery as one operational system.',
        ],
        images: [
          {
            src: 'track_map_example.jpg',
            alt: 'National daily storm-track map generated from automated storm reports',
            caption: 'Automated daily storm-track output combining standardized reports, event groupings, and ArcPy map production. Select the image to view it at full size.',
            treatment: 'portrait',
          },
          {
            src: 'severe_outlook_example.jpeg',
            alt: 'Automated Day 2 severe-weather outlook map',
            caption: 'Recurring severe-weather outlook product prepared for operational distribution and daily alerting.',
          },
        ],
      },
      {
        id: 'claims-applications',
        navLabel: 'Claims applications',
        eyebrow: '02 / Applications',
        title: 'Claims-facing weather applications',
        paragraphs: [
          'I built and maintain hail, wind, hurricane, and current-weather experiences in ArcGIS Experience Builder. These applications let claims professionals search a location, compare layers and event evidence, and move between maps, reports, observations, and supporting datasets without working directly with scientific file formats.',
          'When standard Experience Builder behavior was not enough, I coded custom widgets and API integrations to connect user actions with map responses, control layers, generate records, and present results more clearly. One workflow generates a location-specific weather report combining lightning, hail, wind, observations, warnings, precipitation, and storm reports.',
        ],
        images: [
          {
            src: 'hail_research_map.png',
            alt: 'Hail Research ArcGIS Experience Builder application',
            caption: 'Hail Research: I built the date filtering, evidence layers, report popups, map behavior, and claims-oriented interface around observed reports and gridded hail estimates.',
          },
          {
            src: 'current_weather_map.png',
            alt: 'Current Weather and Forecasts ArcGIS application displaying hurricane guidance',
            caption: 'Current Weather & Forecasts: a multi-source application that brings tropical guidance, radar, reports, warnings, outlooks, precipitation, and observations into one interface.',
          },
        ],
      },
      {
        id: 'product-validation',
        navLabel: 'Product validation',
        eyebrow: '03 / Research',
        title: 'Weather-product research and scientific validation',
        paragraphs: [
          'I research whether new weather datasets are scientifically defensible, operationally useful, and appropriate for claims questions. That work includes evaluating what a variable represents, its spatial and temporal resolution, known biases, update behavior, and the additional evidence needed to support interpretation.',
          'For a smoke and air-quality proof of concept, I combined surface PM2.5 observations with HRRR-Smoke guidance. The work required clearly separating measured air quality from modeled smoke density, testing practical symbology, and explaining why model output should not be treated as a direct surface observation. I apply the same evidence-first approach when evaluating products such as ProbSevere and radar-derived hail estimates.',
        ],
        bullets: [
          'Document source limitations and communicate uncertainty to teammates and member companies.',
          'Pair modeled or remotely sensed products with independent observations when possible.',
          'Reject technically available data when it cannot answer the intended question responsibly.',
        ],
        images: [
          {
            src: 'smoke_map_example.jpeg',
            alt: 'ArcGIS Pro proof of concept comparing PM2.5 observations with HRRR-Smoke output',
            caption: 'Early PM2.5 and HRRR-Smoke proof of concept used to test variable selection, color scales, and the practical limits of comparing modeled smoke with surface observations.',
            treatment: 'smoke',
          },
        ],
      },
      {
        id: 'exploratory-rd',
        navLabel: 'Exploratory R&D',
        eyebrow: '04 / Exploration',
        title: 'Exploratory research and development',
        paragraphs: [
          'As a smaller professional-development project, I contributed to exploratory machine-learning work estimating convective wind-gust speeds from weather-station observations and engineered meteorological predictors.',
          'The work involved cleaning observations, matching gust events with environmental variables, developing physically meaningful predictors, comparing estimates with recorded gusts, and investigating failures caused by station coverage and storm-scale variability. It was a learning project, not a replacement for direct observations or expert meteorological analysis.',
        ],
      },
    ],
    results: [
      'Replaced hours of repetitive daily processing with monitored, repeatable workflows.',
      'Improved consistency and reliability across recurring weather and catastrophe products.',
      'Made complex weather evidence easier for claims professionals to explore and interpret.',
      'Connected raw data acquisition, cloud processing, ArcGIS services, and user-facing applications.',
      'Expanded the range of weather products available while documenting uncertainty and limitations.',
      'Contributed to PLRB receiving a 2025 Esri Special Achievement in GIS Award.',
    ],
    tools: [
      { label: 'Languages and automation', values: 'Python, ArcPy, JavaScript, TypeScript' },
      { label: 'Geospatial systems', values: 'ArcGIS Pro, ArcGIS Enterprise, ArcGIS Server, ArcGIS Online, Experience Builder' },
      { label: 'Cloud and backend', values: 'AWS EC2, S3, RDS, REST APIs' },
      { label: 'Weather data', values: 'Radar, satellite, numerical models, observations, storm reports, smoke, and air-quality data' },
      { label: 'Methods', values: 'Data ingestion, quality control, raster and vector analysis, application development, product validation' },
    ],
  },
  'corteva-field-sensing': {
    title: 'Field-Sensing Systems & Geospatial Research',
    role: 'Corteva Agriscience - Field Sensing Research Associate',
    summary: [
      'At Corteva, I worked across field instrumentation, agronomic research, geospatial analysis, and software automation.',
      'I helped build and operate sensing systems, collected measurements across research sites, independently developed Python and ArcPy processing workflows, linked observations with experimental plots and remote-sensing products, and presented results to agronomists, engineers, and data scientists.',
    ],
    challenge:
      'Mobile field measurements must be quality-controlled, connected with reliable GPS records, assigned to the correct experiment and plot, compared across sites and collection dates, and interpreted alongside crop and environmental conditions. My role covered both the physical systems in the field and the software needed to produce usable research evidence.',
    tags: ['Field sensing', 'Python', 'ArcPy', 'Remote sensing', 'LiDAR', 'Instrumentation', 'Agronomic research'],
    sections: [
      {
        id: 'smartstick-platform',
        navLabel: 'Smartstick platform',
        eyebrow: '01 / Field system',
        title: 'Smartstick platform and field collection',
        paragraphs: [
          'I helped engineer and repeatedly operate Corteva\'s Smartstick, a wheeled platform created to collect spatially referenced crop-canopy measurements. My work covered the complete field system, from determining effective infrared-radiometer placement and establishing repeatable procedures to identifying practical hardware and collection issues.',
          'I evaluated sensor height, orientation, and spacing, consulted engineering teams about related projects, and walked the platform through research fields during recurring campaigns. I also coordinated with personnel at more than seven sites - including Johnston, Dallas Center, Lubbock, and Viluco - to support consistent setup, collection, upload, and documentation.',
        ],
        images: [
          {
            src: 'smartstick.jpeg',
            alt: 'Corteva Smartstick mobile field-sensing platform',
            caption: 'The Smartstick mobile sensing platform configured for repeatable, spatially referenced crop-canopy measurements.',
          },
          {
            src: 'enclosure.jpeg',
            alt: 'Smartstick onboard electronics and data-acquisition enclosure',
            caption: 'Onboard data acquisition, controls, and electronics integrated into the field platform.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'smartstick-pipeline',
        navLabel: 'Smartstick pipeline',
        eyebrow: '02 / Data system',
        title: 'Smartstick cloud and geospatial data pipeline',
        paragraphs: [
          'I independently developed the end-to-end Python and ArcPy workflow behind the Smartstick. After each campaign, sensor observations and GPS records were uploaded through cloud storage. I downloaded and organized the files, performed formatting and quality-control checks, converted coordinates into geospatial points, and matched each observation with the correct field and experimental plot boundaries.',
          'The workflow produced plot-level summaries, maps, and analysis products for the research team and was adapted to data from more than seven sites. I compared ground measurements with drone imagery and drone LiDAR, then evaluated patterns alongside soil moisture, irrigation, evapotranspiration, crop stage, and weather conditions. The proof of concept produced promising results for scalable crop-stress measurement and received strong feedback from the research team.',
        ],
        bullets: [
          'Reduced hours of repetitive post-collection processing.',
          'Standardized ingestion, quality control, spatial assignment, analysis, visualization, and delivery.',
          'Connected field operations, cloud transfer, GPS integration, plot boundaries, remote sensing, and agronomic interpretation in one reproducible workflow.',
        ],
        images: [
          {
            src: 'field_plot_ex.png',
            alt: 'Illustrative field plots with GPS-tagged Smartstick measurement points',
            caption: 'Illustrative workflow example: GPS-tagged measurements converted to points and assigned to experimental plot boundaries.',
          },
          {
            src: 'field_plot_data.png',
            alt: 'Illustrative plot-level analysis values derived from field measurements',
            caption: 'Illustrative analysis output showing how plot-level summaries can be mapped for comparison across an experiment.',
          },
        ],
        note: 'These are explanatory illustrations created to demonstrate the workflow. They do not contain Corteva data and do not depict a Corteva field.',
        code: smartstickCode,
      },
      {
        id: 'nitrous-oxide',
        navLabel: 'N2O experiment',
        eyebrow: '03 / Experimentation',
        title: 'Nitrous oxide field experiment',
        paragraphs: [
          'I contributed to a large nitrous oxide (N2O) experiment using soil-gas flux chambers designed and built by the research team from the ground up. The system measured changes in gas concentration above the soil surface to support emissions research.',
          'I helped construct the chambers, prepare and install equipment, maintain the system throughout the experiment, support repeatable sampling, troubleshoot field issues, and organize collected data. The work demanded careful attention to placement, sealing, timing, maintenance, and environmental conditions because each could affect measurement quality.',
        ],
        images: [
          {
            src: 'gas_sampling_build.jpeg',
            alt: 'Multi-channel soil-gas sampling and valve-control system under construction',
            caption: 'Multi-channel gas-sampling and valve-control system built in-house for the automated soil-flux experiment.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'weather-station',
        navLabel: 'Weather station',
        eyebrow: '04 / Instrumentation',
        title: 'Gold Standard weather station',
        paragraphs: [
          'I designed and built Corteva\'s Gold Standard automated weather station at the Johnston research fields as a trusted reference for comparing weather instruments and field-sensing systems.',
          'The work included selecting and installing components, integrating environmental sensors, constructing an antenna-based relay that transmitted measurements to the main facility in real time, maintaining the station, and supporting side-by-side instrument evaluation. It combined meteorology, communications, instrumentation, and field engineering in one operational reference site.',
        ],
        images: [
          {
            src: 'gold_standard_field.jpeg',
            alt: 'Gold Standard weather station at Corteva field demonstration plots',
            caption: 'Primary view of the Johnston reference station supporting comparisons of precipitation, wind, temperature, humidity, and related measurements.',
          },
          {
            src: 'gold_standard.jpeg',
            alt: 'Supporting view of Gold Standard weather-station instruments',
            caption: 'Supporting instrument view from the Gold Standard comparison site.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'irt-fleet',
        navLabel: 'IRT fleet',
        eyebrow: '05 / Fleet operations',
        title: 'Infrared radiometer fleet',
        paragraphs: [
          'I helped build, maintain, ship, and track hundreds of infrared radiometers used to measure surface or canopy temperature. The fleet supported research across the Midwest, California, Texas, and South America.',
          'I developed code to organize instrument locations, deployment status, maintenance history, and operational notes, and supported field teams receiving, installing, or troubleshooting equipment. The workflow made it easier to identify units that were available, deployed, in transit, or in need of follow-up.',
        ],
        images: [
          {
            src: 'infrared-applications.jpg',
            alt: 'Infrared radiometer used for crop-canopy temperature measurements',
            caption: 'Infrared radiometers were built and maintained for distributed crop-canopy research deployments.',
          },
          {
            src: 'field_plot_2.png',
            alt: 'Illustrative field map with green and red instrument-status markers',
            caption: 'Illustrative fleet-tracking view: green markers represent operational placements and red markers represent units flagged for maintenance or follow-up. This explanatory image does not show Corteva data.',
          },
        ],
      },
    ],
    results: [
      'Reduced hours of manual Smartstick processing through a reusable multi-site workflow.',
      'Connected mobile sensor measurements with GPS records, field boundaries, and experimental plots.',
      'Compared ground measurements with drone imagery and LiDAR for a promising crop-stress proof of concept.',
      'Designed, built, deployed, and maintained field instrumentation from the ground up.',
      'Improved operational tracking for a large sensor fleet distributed across the Americas.',
      'Delivered methods, maps, and findings that cross-functional research teams could evaluate.',
    ],
    tools: [
      { label: 'Programming and geospatial', values: 'Python, ArcPy, ArcGIS Pro, GeoPandas, pandas' },
      { label: 'Field sensing', values: 'Mobile platforms, infrared radiometers, weather instruments, soil-gas flux chambers' },
      { label: 'Remote sensing', values: 'Drone imagery, drone LiDAR, GPS-tagged field observations' },
      { label: 'Data management', values: 'Cloud transfer, quality control, spatial assignment, plot-level summarization' },
      { label: 'Research methods', values: 'Field experimentation, instrument design, environmental monitoring, statistical analysis, technical presentation' },
    ],
  },
}

function SectionMedia({ images, base }: { images: CaseStudyImage[]; base: string }) {
  return (
    <div className={`case-media-grid ${images.length === 1 ? 'is-single' : ''}`}>
      {images.map((image) => (
        <figure className={`case-media ${image.treatment ? `case-media--${image.treatment}` : ''}`} key={image.src}>
          <a href={`${base}${image.src}`} target="_blank" rel="noreferrer" aria-label={`${image.alt} - open full size`}>
            <img src={`${base}${image.src}`} alt={image.alt} loading="lazy" />
          </a>
          <figcaption>{image.caption}</figcaption>
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
          <p className="project-kind">{study.role}</p>
          <h1>{study.title}</h1>
          <div className="case-hero-summary">
            {study.summary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <ul className="tech-list" aria-label="Case study technologies">
            {study.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        </header>

        <aside className="case-challenge" aria-labelledby="case-challenge-title">
          <p className="case-kicker">The challenge</p>
          <h2 id="case-challenge-title">Turning complex evidence into a usable system</h2>
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
                {section.bullets && (
                  <ul className="case-bullets">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </div>

              {section.images && <SectionMedia images={section.images} base={base} />}
              {section.note && <p className="case-media-note">{section.note}</p>}
              {section.code && (
                <details className="case-code">
                  <summary>View concise geospatial code example</summary>
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

        <a className="text-link case-study-footer-link" href={base}>Back to portfolio</a>
      </div>
    </main>
  )
}
