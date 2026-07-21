import { useEffect, useState } from 'react'
import { CaseStudyFooter } from './CaseStudyFooter'
import { CaseStudyHeroScene, type HeroSceneVariant } from './CaseStudyHeroScene'
import { caseStudyUrl } from '../utils/routes'

type CaseStudyImage = {
  src: string
  alt: string
  caption: string
  label?: string
  treatment?: 'portrait' | 'smoke'
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

const smartstickCode = `############### ARCGIS SECTION #######################
import arcpy
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
import os


def run_arcgis_operations(concatenated_file_path, site, date, data_directory):
    arcpy.env.workspace = data_directory
    arcpy.env.overwriteOutput = True

    # Define the field-boundary shapefile for each collection site.
    shapefile_paths = {
        "Loc1": r"path_to_file",
        "Loc2": r"path_to_file",
        "Loc3": r"path_to_file",
        "Loc4": r"path_to_file",
        "Loc5": r"path_to_file",
        "Loc6": r"path_to_file",
    }

    shp = shapefile_paths.get(site)
    if not shp:
        print("FAILED: No shapefile found for the specified site")
        return None

    # Import field boundaries and convert sensor longitude and latitude to points.
    shapefile_imported = "shapefile_imported.shp"
    arcpy.management.CopyFeatures(shp, shapefile_imported)
    print(f"Loading shapefile from \${shp}")

    point_layer = "xy_points"
    arcpy.management.XYTableToPoint(concatenated_file_path, point_layer, "lon", "lat")
    print("Importing point layer using XY Table to Point")

    # Dissolve field boundaries to the plot identifier used for spatial assignment.
    dissolved_layer = "dissolved_layer.shp"
    arcpy.management.Dissolve(shapefile_imported, dissolved_layer, "PRISM_ID")
    print("Dissolved shapefile by PRISM_ID")

    # Match observations inside their corresponding field plots.
    spatial_join_within = "spatial_join_within.shp"
    arcpy.analysis.SpatialJoin(
        point_layer,
        dissolved_layer,
        spatial_join_within,
        join_type="KEEP_ALL",
        match_option="WITHIN",
        join_operation="JOIN_ONE_TO_MANY",
    )
    print("Joined point layer to dissolved field boundaries")

    # Create an inward buffer to flag observations near plot edges.
    buffer_layer = "buffer_layer.shp"
    arcpy.analysis.Buffer(
        dissolved_layer,
        buffer_layer,
        "-1.5 Feet",
        dissolve_option="LIST",
        dissolve_field="PRISM_ID",
    )
    print("Created -1.5 ft buffers by PRISM_ID")

    spatial_join_buffer = "spatial_join_buffer.shp"
    arcpy.analysis.SpatialJoin(
        spatial_join_within,
        buffer_layer,
        spatial_join_buffer,
        join_type="KEEP_ALL",
        match_option="WITHIN",
        join_operation="JOIN_ONE_TO_MANY",
    )
    print("Joined the assigned points to the plot-edge buffers")

    # Export the attributed observations for downstream analysis.
    csv_output_path = os.path.join(
        data_directory,
        f"spatial_join_buffer_output_\${site}_\${date}.csv",
    )
    arcpy.conversion.TableToTable(
        spatial_join_buffer,
        os.path.dirname(csv_output_path),
        os.path.basename(csv_output_path),
    )
    print("Exported table as CSV")

    df_csv = pd.read_csv(csv_output_path)
    print("CSV File Columns:", df_csv.columns.tolist())
    print(f"ArcGIS process complete. Outputs saved to \${csv_output_path}")

    # Plot field boundaries and observations for a quick spatial QA check.
    gdf_dissolved = gpd.read_file(os.path.join(data_directory, dissolved_layer))
    points_gdf = gpd.GeoDataFrame(
        df_csv,
        geometry=gpd.points_from_xy(df_csv.lon, df_csv.lat),
    )
    points_gdf = points_gdf[~((points_gdf["lon"] == 0) & (points_gdf["lat"] == 0))]

    fig, ax = plt.subplots(figsize=(16, 8))
    gdf_dissolved.plot(
        ax=ax,
        color="lightblue",
        edgecolor="black",
        alpha=0.6,
        label="Experimental plot boundaries",
    )
    points_gdf.plot(
        ax=ax,
        color="red",
        markersize=5,
        label="GPS-tagged sensor observations",
    )
    plt.title(f"Sensor observations and plot boundaries: \${site}")
    plt.legend()
    plt.show()

    return csv_output_path


arcgis_output_csv = run_arcgis_operations(
    concatenated_file_path,
    site,
    date,
    data_directory,
)`

const caseStudies: Record<string, ProfessionalCaseStudy> = {
  'plrb-weather-systems': {
    title: 'Weather, Catastrophe, & Geospatial Analysis',
    role: 'PLRB - Weather & Catastrophe Analyst',
    scene: 'plrb',
    summary: [
      'I build and maintain production weather-data systems that turn NOAA, IEM, and other environmental datasets into reliable maps, reports, archives, and claims-facing applications.',
    ],
    challengeTitle: 'Turning fragmented weather data into reliable claims decision support',
    challenge:
      'Claims professionals need weather evidence they can trust on the day they ask for it. I turn NOAA, IEM, and other environmental data into daily production systems that remain accurate when reports arrive late, records are duplicated or incomplete, and downloads fail silently — and that keep maps, tables, and exports synchronized end to end.',
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
          'I own and support daily workflows for storm-report archiving, data acquisition, SPC outlook imagery, ArcGIS-ready datasets, email text, and long-term archives. The systems process hundreds to thousands of reports, files, and features each day; occurrence-number assignment is the primary remaining manual step.',
          'Python and ArcPy collect and validate NOAA and IEM data, standardize fields, generate maps and exports, publish updates to ArcGIS Server, and alert the team when expected inputs fail. The automation has removed hours of repetitive work from a typical day.',
        ],
        bullets: [
          'Reconciles reports that arrive after the initial daily run.',
          'Detects duplicates, missing timestamps, invalid identifiers, and incomplete city or ZIP fields.',
          'Catches silent download failures before incomplete products are distributed.',
          'Preserves edits through GIS transformations and keeps maps, tables, and exports synchronized.',
        ],
        images: [
          {
            src: 'track_map_example.jpg',
            alt: 'National daily storm-track map generated from automated storm reports',
            caption: 'Daily storm-track output generated from standardized reports, event groupings, and automated ArcPy map production.',
            treatment: 'portrait',
          },
          {
            src: 'severe_outlook_example.jpeg',
            alt: 'Automated Day 2 severe-weather outlook map',
            caption: 'Recurring SPC outlook product prepared automatically for operational distribution.',
          },
        ],
      },
      {
        id: 'claims-applications',
        navLabel: 'Claims applications',
        eyebrow: '02 / Applications',
        title: 'Claims-facing weather applications',
        paragraphs: [
          'I build and maintain ArcGIS Experience Builder applications for hail, wind, hurricanes, and current weather. They combine reports, warnings, observations, radar-derived products, precipitation, lightning, and other evidence so claims professionals can investigate a location without handling raw scientific formats.',
          'Where standard widgets were insufficient, I developed custom behavior and API integrations for date filtering, layer control, record generation, map synchronization, and location-specific reports.',
        ],
        images: [
          {
            src: 'hail_research_map.png',
            alt: 'Hail Research ArcGIS Experience Builder application',
            label: 'Hail research application',
            caption: 'Claims-oriented interface combining observed reports, gridded hail estimates, date controls, and evidence popups.',
          },
          {
            src: 'current_weather_map.png',
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
          'I evaluate whether new datasets are scientifically defensible and operationally useful by testing what each variable represents, its spatial and temporal resolution, known biases, update behavior, and the evidence required for responsible interpretation.',
          'Examples include comparing surface PM2.5 observations with HRRR-Smoke guidance and evaluating products such as ProbSevere and radar-derived hail estimates. The emphasis is not simply adding more layers; it is preventing modeled or remotely sensed estimates from being presented as direct observations.',
        ],
        images: [
          {
            src: 'smoke_map_example.jpeg',
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
          'I conducted an exploratory machine-learning study that matched observed convective gusts with physically relevant environmental predictors, compared estimated and recorded wind speeds, and diagnosed failures caused by sparse station coverage and storm-scale variability.',
          'The work clarified where modeled gust estimates may add context and where direct observations and expert meteorological analysis remain necessary.',
        ],
      },
    ],
    results: [
      'Automated daily maps, archives, email alert content, data exports, and ArcGIS updates that previously required hours of manual work.',
      'Made production workflows resilient to late, missing, duplicated, malformed, and silently failed inputs.',
      'Built claims-facing applications that keep displayed maps and downstream records aligned.',
      'Expanded available weather evidence while documenting uncertainty and appropriate use.',
      'Contributed to PLRB’s 2025 Esri Special Achievement in GIS Award.',
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
    role: 'Corteva Agriscience - Field Sensing Research Associate',
    scene: 'corteva',
    summary: [
      'I designed field-sensing systems and the Python and ArcPy workflows that converted high-frequency measurements into quality-controlled, plot-level research data.',
    ],
    challengeTitle: 'Turning field measurements into reliable research evidence',
    challenge:
      'Field-sensing research requires more than collecting measurements. Sensors must be designed, deployed, maintained, and connected to workflows that identify bad readings, preserve spatial context, and produce data researchers can compare across plots, sites, instruments, and experiments. My work covered that full process—from building and operating field systems to automating the quality control, geospatial processing, visualization, and analysis of their measurements.',
    next: { label: 'Read my M.S. thesis', slug: 'land-use-convective-weather' },
    tags: ['Field sensing', 'Python', 'ArcPy', 'Trimble GPS', 'LiDAR', 'Instrumentation', 'Quality control'],
    sections: [
      {
        id: 'smartstick-platform',
        navLabel: 'Smartstick platform',
        eyebrow: '01 / Field system',
        title: 'Smartstick sensing platform',
        paragraphs: [
          'I co-developed Corteva\'s Smartstick, a wheeled platform that recorded crop-canopy conditions while moving through experimental rows, and operated it throughout the season. Infrared radiometers and thermocouples measured below-canopy, within-canopy, and upper-canopy temperatures, while additional sensors measured air temperature within and above the canopy.',
          'An onboard computer recorded each observation with a timestamp and Trimble GPS coordinate. I designed the sensor placement, field procedures, and downstream analysis system; the enclosure\'s internal logging and cloud-transfer implementation were handled by others.',
        ],
        bullets: [
          'Collected thousands of spatially referenced measurements per walk.',
          'Repeated collection approximately twice a week for two months at each site.',
          'Maintained sensors and collection procedures to limit drift and site-to-site inconsistency.',
        ],
        images: [
          {
            src: 'smartstick.jpeg',
            alt: 'Corteva Smartstick mobile field-sensing platform',
            label: 'Field collection setup',
            caption: 'Mobile platform configured to collect canopy and air-temperature measurements with GPS and timestamps.',
          },
          {
            src: 'enclosure.jpeg',
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
          'I independently built the Python and ArcPy pipeline that processed each collection from raw tabular files through research-ready outputs. It standardized the data, plotted measurements for visual quality control, removed irrelevant or unrealistic readings, excluded bad GPS positions and outliers, converted coordinates to points, and spatially joined every valid observation to its experimental plot, treatment, and genotype.',
          'ArcPy used plot boundaries and inward buffers to remove observations outside plots or too close to plot edges. The workflow then generated point layers, shapefiles, plot summaries, maps, tables, and analysis products, replacing about one hour of manual processing after every walk.',
        ],
        bullets: [
          'Applied the same workflow to data from seven research sites.',
          'Overlaid measurements on drone imagery for spatial review.',
          'Compared LiDAR-derived canopy structure with ground measurements and crop-stress response.',
          'Found a positive relationship between Smartstick measurements and how experimental corn plots responded to stress.',
        ],
        images: [
          {
            src: 'field_plot_ex.png',
            alt: 'Illustrative field plots with GPS-tagged Smartstick measurement points',
            caption: 'Illustrative workflow: GPS-tagged observations converted to points and assigned to buffered experimental plots.',
          },
          {
            src: 'field_plot_data.png',
            alt: 'Illustrative plot-level analysis values derived from field measurements',
            caption: 'Illustrative plot-level summaries used to compare spatial patterns across an experiment.',
          },
        ],
        note: 'These explanatory illustrations do not contain Corteva data or depict a Corteva field.',
        code: smartstickCode,
      },
      {
        id: 'nitrous-oxide',
        navLabel: 'N₂O experiment',
        eyebrow: '03 / Experimentation',
        title: 'Automated N₂O chamber system',
        paragraphs: [
          'I co-designed and co-built a sixteen-chamber automated soil-gas system — wiring, tubing, controls, and code. It sampled every fifteen minutes for four months, so failures in a chamber, valve, line, or control component could compromise long stretches of data.',
          'I installed, maintained, and debugged the system in the field, then worked with data scientists to review the measurements, explain equipment-related anomalies, and distinguish valid signals from operational artifacts.',
        ],
        images: [
          {
            src: 'gas_sampling_build.jpeg',
            alt: 'Multi-channel soil-gas sampling and valve-control system under construction',
            caption: 'In-house valve-control and sampling system carrying chamber air to an on-site analyzer.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'weather-station',
        navLabel: 'Weather station',
        eyebrow: '04 / Instrumentation',
        title: 'Gold Standard instrument-comparison site',
        paragraphs: [
          'I co-designed and built a reference station used to compare weather instruments and quantify how much nominally similar systems could disagree. The site included nine rain gauges, four anemometers, four temperature sensors, infrared sensors, and instruments from vendors including Davis.',
          'A data logger transmitted observations by radio to a computer in the research building. I supported ingestion, maintained the field system, and helped make the measurements available through a web-based visualization site.',
        ],
        images: [
          {
            src: 'gold_standard_field.jpeg',
            alt: 'Gold Standard weather station at Corteva field demonstration plots',
            caption: 'Reference site supporting side-by-side comparisons of precipitation, wind, temperature, and infrared measurements.',
          },
          {
            src: 'gold_standard.jpeg',
            alt: 'Dylan McDermott on site during assembly of the reference weather station',
            caption: 'On site during assembly of the sensor mast, logging enclosures, and radio-linked acquisition system.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'irt-fleet',
        navLabel: 'IRT fleet',
        eyebrow: '05 / Fleet operations',
        title: 'Infrared-radiometer fleet tracking',
        paragraphs: [
          'I built, maintained, shipped, and supported infrared radiometers in a fleet of more than 200 deployed across the Midwest, California, Texas, and South America.',
          'I created sensor-tracking dashboards that consolidated serial numbers, calibration records, deployment locations, shipment status, repair history, operational notes, and data status. The system gave the team a single view of which instruments were available, deployed, in transit, or needed maintenance.',
        ],
        images: [
          {
            src: 'infrared-applications.jpg',
            alt: 'Infrared radiometer used for crop-canopy temperature measurements',
            caption: 'Infrared radiometers built and maintained for distributed crop-canopy research.',
          },
          {
            src: 'field_plot_2.png',
            alt: 'Illustrative field map with green and red instrument-status markers',
            caption: 'Illustrative fleet view showing operational placements and units requiring follow-up; no Corteva data is shown.',
          },
        ],
      },
    ],
    results: [
      'Automated approximately one hour of processing per Smartstick walk—on the order of 100 hours across the collection campaign.',
      'Converted thousands of timestamped, GPS-tagged readings into validated plot-level datasets and maps.',
      'Applied one reproducible workflow across seven research sites and compared selected results with drone imagery and LiDAR.',
      'Designed, built, maintained, and debugged field instrumentation from individual sensors to multi-month automated experiments.',
      'Created centralized tracking for more than 200 distributed infrared radiometers.',
    ],
    tools: [
      { label: 'Sensing', values: 'IRTs, thermocouples, air-temperature sensors, automated gas chambers' },
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
          <a href={`${base}${image.src}`} target="_blank" rel="noreferrer" aria-label={`${image.alt} - open full size`}>
            <img src={`${base}${image.src}`} alt={image.alt} loading="lazy" />
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