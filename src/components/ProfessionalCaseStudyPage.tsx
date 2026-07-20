import { useEffect, useState } from 'react'
import { CaseStudyFooter } from './CaseStudyFooter'
import { CaseStudyHeroScene, type HeroSceneVariant } from './CaseStudyHeroScene'

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

const smartstickCode = `############### ARCGIS ##############################
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
      'I design and maintain operational weather and geospatial tools that help claims professionals evaluate events and understand complex environmental data.',
      'My work connects meteorology with Python and ArcPy automation, ArcGIS application development, cloud infrastructure, APIs, and research into emerging weather products. The objective is to turn technical datasets into reliable, transparent tools for event verification and catastrophe analysis.',
    ],
    challengeTitle: 'Converting fragmented weather evidence into operational products',
    challenge:
      'Claims questions rarely have one perfect data source. Radar, observations, models, satellite products, warnings, and storm reports all differ in format, resolution, timing, and uncertainty. I build repeatable systems that organize those sources and make their limits understandable to non-meteorologists.',
    next: { label: 'Corteva — Field-sensing research', slug: 'corteva-field-sensing' },
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
            label: 'Hail research application',
            caption: 'I built the date filtering, evidence layers, report popups, map behavior, and claims-oriented interface around observed reports and gridded hail estimates.',
          },
          {
            src: 'current_weather_map.png',
            alt: 'Current Weather and Forecasts ArcGIS application displaying hurricane guidance',
            label: 'Hurricane event analysis',
            caption: 'A multi-source application bringing tropical guidance, radar, reports, warnings, outlooks, precipitation, and observations into one claims-ready interface.',
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
          'Assess data quality, source limitations, uncertainty, and transparent methodology for operational products.',
          'Integrate radar, satellite, numerical-model, and observational datasets into regional and national geospatial products.',
          'Evaluate how variable definition, spatial and temporal resolution, and update behavior affect claims-oriented interpretation.',
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
          'I conducted an exploratory machine-learning study estimating convective wind-gust speeds from station observations and physically relevant environmental predictors.',
          'The work involved cleaning observations, matching gust events with environmental variables, developing physically meaningful predictors, comparing estimates with recorded gusts, and investigating failures caused by station coverage and storm-scale variability. The results were exploratory: they inform where modeled gust estimates break down, and are not a replacement for direct observations or expert meteorological analysis.',
        ],
      },
    ],
    results: [
      'Delivered monitored daily weather and catastrophe products with fewer manual processing steps.',
      'Built claims-facing applications that make multi-source event evidence easier to search, compare, and interpret.',
      'Connected data acquisition, quality control, cloud processing, ArcGIS services, and user-facing applications.',
      'Expanded weather evidence responsibly by documenting source limits, uncertainty, and appropriate use.',
    ],
    tools: [
      { label: 'Geospatial automation', values: 'Python, ArcPy, ArcGIS Enterprise' },
      { label: 'Claims applications', values: 'Experience Builder, custom widgets, REST APIs' },
      { label: 'Weather evidence', values: 'Radar, satellite, models, observations, storm reports' },
      { label: 'Operations', values: 'AWS, quality control, publishing, product validation' },
    ],
  },
  'corteva-field-sensing': {
    title: 'Field-Sensing Systems & Geospatial Research',
    role: 'Corteva Agriscience - Field Sensing Research Associate',
    scene: 'corteva',
    summary: [
      'At Corteva, I worked across field instrumentation, geospatial data processing, agronomic research, and software automation. I helped develop and operate sensing systems, built Python and ArcPy workflows, and converted field measurements into analysis products used by research teams.',
    ],
    challengeTitle: 'Connecting field measurements to research-ready geospatial data',
    challenge:
      'Mobile field measurements must be quality-controlled, connected with reliable GPS records, assigned to the correct experiment and plot, compared across sites and collection dates, and interpreted alongside crop and environmental conditions. My role covered both the physical systems in the field and the software needed to produce usable research evidence.',
    // Points at the thesis reader (an embedded PDF), not a case study — the
    // label has to say so.
    next: { label: 'Read my M.S. thesis', slug: 'land-use-convective-weather' },
    tags: ['Field sensing', 'Python', 'ArcPy', 'Remote sensing', 'LiDAR', 'Instrumentation', 'Agronomic research'],
    sections: [
      {
        id: 'smartstick-platform',
        navLabel: 'Smartstick platform',
        eyebrow: '01 / Field system',
        title: 'Smartstick platform and field collection',
        paragraphs: [
          'I helped engineer and repeatedly operate Corteva\'s Smartstick, a wheeled platform created to collect spatially referenced crop-canopy measurements. My work covered the complete field system, from determining effective infrared-radiometer placement and establishing repeatable procedures to identifying practical hardware and collection issues.',
          'I evaluated sensor height, orientation, and spacing, consulted engineering teams about related projects, and walked the platform through research fields during recurring campaigns. I also coordinated with personnel at seven sites - including Johnston, Dallas Center, Lubbock, and Viluco - to support consistent setup, collection, upload, and documentation.',
        ],
        images: [
          {
            src: 'smartstick.jpeg',
            alt: 'Corteva Smartstick mobile field-sensing platform',
            label: 'Field collection setup',
            caption: 'Smartstick platform configured for repeatable, spatially referenced crop-canopy measurements.',
          },
          {
            src: 'enclosure.jpeg',
            alt: 'Smartstick onboard electronics and data-acquisition enclosure',
            label: 'Smartstick sensor enclosure',
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
          'The workflow produced plot-level summaries, maps, and analysis products for the research team and was adapted to data from seven sites. For selected sites I compared ground measurements with drone imagery and drone LiDAR, then evaluated patterns alongside soil moisture, irrigation, evapotranspiration, crop stage, and weather conditions. The proof of concept demonstrated that mobile canopy measurements could be consistently processed, assigned to experimental plots, and compared with drone and environmental datasets.',
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
        navLabel: 'N₂O experiment',
        eyebrow: '03 / Experimentation',
        title: 'Nitrous oxide (N₂O) field experiment',
        paragraphs: [
          'I contributed to a large nitrous oxide (N₂O) field experiment built around sixteen soil-gas flux chambers. The system sampled on an automated fifteen-minute cycle and fed an on-site analyzer, so a single fault in a chamber, line, or valve could quietly corrupt a long stretch of the record. Our team hand-assembled the sampling manifolds, and I helped install, maintain, and troubleshoot the system across the campaign.',
          'The resulting time series went to data science teams for analysis, and I worked with them to interpret the output — reviewing measurement quality, explaining field conditions and equipment behavior behind unusual values, and helping separate real soil-flux signal from artifacts of the sampling system. The collaboration turned continuous chamber measurements into conclusions the wider research group could act on.',
        ],
        highlight: 'Helped build, deploy, maintain, and troubleshoot a sixteen-chamber automated sampling system, then partnered with data science teams to interpret what it measured.',
        images: [
          {
            src: 'gas_sampling_build.jpeg',
            alt: 'Multi-channel soil-gas sampling and valve-control system under construction',
            caption: 'Multi-channel valve-control and sampling manifold, assembled in-house, that carried chamber air to the on-site analyzer on an automated cycle.',
            treatment: 'portrait',
          },
        ],
      },
      {
        id: 'weather-station',
        navLabel: 'Weather station',
        eyebrow: '04 / Instrumentation',
        title: 'Gold Standard reference weather station',
        paragraphs: [
          'I designed and built Corteva\'s Gold Standard automated weather station at the Johnston research fields. The site served as the reference against which other weather instruments and field-sensing systems were compared, so its measurements had to be well-sited, well-maintained, and continuously available. I integrated environmental sensors, operationalized an antenna-based relay, and maintained the site for side-by-side instrument evaluation.',
        ],
        highlight: 'Built the real-time field-to-facility data relay that supported reliable weather-instrument comparison at the reference site.',
        images: [
          {
            src: 'gold_standard_field.jpeg',
            alt: 'Gold Standard weather station at Corteva field demonstration plots',
            caption: 'Primary view of the Johnston reference station supporting comparisons of precipitation, wind, temperature, humidity, and related measurements.',
          },
          {
            src: 'gold_standard.jpeg',
            alt: 'Dylan McDermott on site during assembly of the reference weather station',
            caption: 'On site during assembly, showing the sensor mast, radiation shields, and solar-powered logging enclosures at working scale.',
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
      'Showed that mobile canopy measurements could be processed, plot-assigned, and compared against drone imagery and LiDAR.',
      'Designed, built, deployed, and maintained field instrumentation from the ground up.',
      'Improved operational tracking for a large sensor fleet distributed across the Americas.',
      'Delivered methods, maps, and findings that cross-functional research teams could evaluate.',
    ],
    tools: [
      { label: 'Geospatial automation', values: 'Python, ArcPy, ArcGIS Pro' },
      { label: 'Field systems', values: 'Smartstick, IRTs, weather station, gas-flux chambers' },
      { label: 'Spatial evidence', values: 'GPS, plot boundaries, drone imagery, LiDAR' },
      { label: 'Data workflow', values: 'Cloud transfer, quality control, plot-level analysis' },
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
          next={{ label: study.next.label, href: `${base}?work=${study.next.slug}` }}
        />
      </div>
    </main>
  )
}
