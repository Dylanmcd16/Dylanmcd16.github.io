// ---------------------------------------------------------------------------
// Portfolio content. Edit this file to change almost all visible text.
// ---------------------------------------------------------------------------

export type ProjectLink = {
  label: string
  href: string
}

export type Project = {
  slug: string
  title: string
  kind: string
  description: string
  accent: 'operations' | 'field' | 'modeling' | 'analysis'
  outcomes?: string[]
  keyContribution?: string
  caseStudy: {
    overview: string
    examples: string[]
  }
  tech: string[]
  links: ProjectLink[]
  featured?: boolean
  // Optional screenshot: drop a file in /public and set e.g. 'projects/example.png' 
  image?: string
  imageAlt?: string
}

// The work cards carry the descriptions, so the timeline is role / org / dates only.
export type Experience = {
  organization: string
  role: string
  period: string
  scope: string
}

export type SkillGroup = {
  title: string
  items: string[]
}

export type EducationItem = {
  degree: string
  year: string
  workLabel: string
  work: string
  href?: string
}

export const portfolio = {
  name: 'Dylan McDermott',
  role: 'Meteorologist | Geospatial Data Professional',
  tagline: 'Atmospheric science · Geospatial data · Automation',
  location: 'West Des Moines, Iowa',
  email: 'dylanddermott@gmail.com',
  resumeFile: 'resume.pdf',
  thesisFile: 'McDermott_iastate_0097M_21473.pdf',
  photo: 'photo-avatar.jpg',

  heroStatement:
    'I build automated geospatial and weather-data workflows that turn complex scientific observations into reliable maps, analyses, and operational products. That work spans operational weather and catastrophe systems at PLRB, field-sensing research at Corteva Agriscience, graduate research in atmospheric modeling at Iowa State, and an independently built React and FastAPI weather-intelligence platform.',

  links: {
    github: 'https://github.com/Dylanmcd16',
    linkedin: 'https://www.linkedin.com/in/dylan-mcdermott-193b18174/',
  },

  projects: [
    {
      slug: 'plrb-weather-systems',
      title: 'Weather, Catastrophe, & Geospatial Analysis',
      kind: 'PLRB · Professional · 2025–Present',
      accent: 'operations',
      featured: true,
      description:
        'PLRB’s goal is to give members fast, defensible access to historical weather evidence for claims handling, investigations, and catastrophe analysis. I build and maintain the Python and ArcPy workflows, geospatial products, and custom ArcGIS applications that transform NOAA, IEM, and other public datasets into ready-to-use national layers, maps, reports, and address-level insights. These production systems validate and reconcile late, duplicated, incomplete, or failed data so members can retrieve reliable weather information without having to process the raw sources themselves.',
      outcomes: [
        'Built, maintained, and improved daily production workflows that collect, validate, reconcile, transform, and publish national weather and hazard data.',
        'Developed ArcGIS-based services and JavaScript tools that let members visualize, query, and integrate weather data into their GIS workflows.',
        'Contributed to PLRB’s 2025 Esri Special Achievement in GIS Award.',
      ],
      caseStudy: {
        overview:
          'At PLRB, I build and maintain the operational weather and geospatial systems behind event verification and catastrophe analysis, pairing meteorological interpretation with automated data processing that has to hold up in daily production.',
        examples: [
          'Built automated ingestion, validation, and publication workflows for weather and hazard datasets.',
          'Produced raster and vector products that communicate severe weather, precipitation, smoke, evacuation, earthquake, and outage impacts.',
          'Built cloud-hosted services and API integrations that support repeatable, data-driven workflows.',
        ],
      },
      tech: ['Python', 'ArcGIS Pro & Enterprise', 'ArcPy', 'AWS'],
      links: [],
    },
    {
      slug: 'corteva-field-sensing',
      title: 'Field Sensing Research Associate',
      kind: 'Corteva Agriscience · 2024',
      accent: 'field',
      description:
        'Corteva needed a repeatable way to turn raw, GPS-linked field measurements into research-ready evidence. I built and operated the sensing systems, then independently developed the Python and ArcPy pipelines that validated, spatially assigned, and analyzed the data.',
      keyContribution:
        'Co-developed Corteva’s Smartstick field-sensing platform and built the workflow that processed its GPS-linked observations across seven research sites into quality-controlled, plot-level geospatial analyses, then compared selected results with drone imagery and LiDAR.',
      caseStudy: {
        overview:
          'At Corteva, I built and operated field-sensing systems and independently developed the processing workflows that turned their raw observations into plot-level geospatial analyses for research teams.',
        examples: [
          'Built systems ranging from a gold-standard automated weather station and custom N₂O soil-gas flux chambers to hundreds of infrared radiometers deployed across the Americas.',
          'Built the Python and ArcPy pipeline that validated, spatially assigned, visualized, and delivered Smartstick measurements from seven research sites; compared selected results with drone imagery and LiDAR.',
        ],
      },
      tech: ['Python', 'ArcPy', 'Field sensing', 'Spatial analysis'],
      links: [],
    },
    {
      slug: 'land-use-convective-weather',
      title: 'Land-Use Effects on Convective Weather',
      kind: 'Iowa State · M.S. Research · 2022–2024',
      accent: 'modeling',
      description:
        'Designed and ran WRF and Noah-MP simulations to determine how historical land-use change affected Midwest rainfall and mesoscale convective systems.',
      keyContribution:
        'Produced an M.S. thesis combining atmospheric modeling, geospatial data preparation, and analysis of ERA5, CESM, WRF, and observational datasets.',
      caseStudy: {
        overview:
          'My M.S. research examined how historical land-use change affected Midwest rainfall, surface fluxes, moisture transport, and mesoscale convective systems. The work combined numerical weather and land-surface modeling with geospatial data preparation and multi-source analysis.',
        examples: [
          'Designed and ran WRF and Noah-MP experiments at multiple model resolutions.',
          'Prepared land-surface datasets by translating CESM/LUMIP land-use data to model grids.',
          'Compared ERA5, CESM, WRF, and observational datasets using Python, xarray, MATLAB, and NetCDF.',
        ],
      },
      tech: ['WRF', 'Noah-MP', 'Python', 'xarray'],
      links: [],
    },
    {
      slug: 'boundary-layer-research',
      title: 'Boundary-Layer Meteorology Research',
      kind: 'Iowa State · Undergraduate Research Assistant · 2021',
      accent: 'analysis',
      description:
        'Boundary-layer meteorology research with Dr. Ian Williams at Iowa State University. I identified the cases worth analyzing and produced the scientific plots and visualizations used to interpret them.',
      keyContribution:
        'Built the case set and visualizations that an incoming graduate student used to carry the project forward.',
      caseStudy: {
        overview:
          'My undergraduate research focused on boundary-layer meteorology with Dr. Ian Williams at Iowa State University, separate from my senior thesis on extreme convective wind in Iowa.',
        examples: [
          'Identified relevant cases for further meteorological analysis.',
          'Generated the scientific plots and visualizations used to interpret findings.',
        ],
      },
      tech: ['Boundary-layer meteorology', 'Case identification', 'Data visualization', 'Research collaboration'],
      links: [],
    },
  ] as Project[],

  experience: [
    {
      organization: 'Property & Liability Resource Bureau',
      scope: 'Production weather systems, geospatial automation, and catastrophe decision support',
      role: 'Meteorologist — Weather & Catastrophe Analyst',
      period: '2025 — Present',
    },
    {
      organization: 'Corteva Agriscience',
      scope: 'Field-sensing systems, automated geospatial pipelines, and research instrumentation',
      role: 'Field Sensing Research Associate',
      period: '2024',
    },
    {
      organization: 'Iowa State University',
      scope: 'Atmospheric modeling, land-use research, and scientific data analysis',
      role: 'Graduate Research Assistant',
      period: '2022 — 2024',
    },
    {
      organization: 'Iowa State University',
      scope: 'Boundary-layer meteorology research and scientific visualization',
      role: 'Undergraduate Research Assistant',
      period: '2021',
    },
  ] satisfies Experience[],

  skills: [
    {
      title: 'Meteorology',
      items: [
        'Radar applications',
        'Numerical weather prediction',
        'Numerical modeling',
        'Remote sensing',
      ],
    },
    {
      title: 'Geospatial',
      items: [
        'ArcGIS Pro',
        'ArcGIS Enterprise',
        'Experience Builder',
        'ArcPy',
        'GeoPandas',
        'Rasterio',
        'Spatial and raster analysis',
      ],
    },
    {
      title: 'Data & Automation',
      items: [
        'Python',
        'pandas',
        'xarray',
        'Automated data pipelines',
        'Data quality control',
        'REST API integration',
        'NetCDF, GRIB, and GeoTIFF',
      ],
    },
    {
      title: 'Software & Cloud',
      items: [
        'TypeScript',
        'JavaScript',
        'React',
        'FastAPI',
        'AWS',
        'SQL and PostgreSQL',
        'Git and GitHub',
        'Linux',
      ],
    },
  ] satisfies SkillGroup[],

  education: [
    {
      degree: 'M.S. in Meteorology — Iowa State University',
      year: '2024',
      workLabel: 'Thesis',
      work: 'Impacts of U.S. Deforestation on Rainfall from Mesoscale Convective Systems',
    },
    {
      degree: 'B.S. in Meteorology — Iowa State University',
      year: '2022',
      workLabel: 'Senior thesis',
      work: 'Extreme Convective Wind Magnitude and Duration in Iowa',
    },
  ] satisfies EducationItem[],

  contactLead:
    'I welcome conversations about roles involving meteorology, geospatial data, environmental analysis, scientific computing, automation, or research.',
}
