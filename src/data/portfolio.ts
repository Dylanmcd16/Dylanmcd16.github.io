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
  role: 'Meteorologist & Geospatial Data Professional',
  tagline: 'Atmospheric science · Geospatial data · Automation',
  location: 'West Des Moines, Iowa',
  email: 'dylanddermott@gmail.com',
  resumeFile: 'resume.pdf',
  thesisFile: 'McDermott_iastate_0097M_21473.pdf',
  photo: 'photo-avatar.jpg',

  heroStatement:
    'I’m a meteorologist who uses atmospheric science, geospatial data, and software to solve practical environmental problems. My work spans operational weather and catastrophe analysis, field-sensing research, numerical modeling, and geospatial automation.',

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
        'I develop weather-data workflows and geospatial products for event verification, catastrophe analysis, and decision support. The work connects meteorological interpretation with automation and quality control.',
      outcomes: [
        'Built and maintained national weather and hazard-data workflows and geospatial products for event verification, catastrophe analysis, and decision support.',
      ],
      caseStudy: {
        overview:
          'At PLRB, I contribute to operational weather and geospatial systems used to support event verification, catastrophe analysis, and decision-making. The work requires practical meteorological interpretation alongside reliable automated data processing.',
        examples: [
          'Automated ingestion, validation, and publication workflows for weather and hazard datasets.',
          'Raster and vector products that help communicate severe weather, precipitation, smoke, evacuation, earthquake, and outage impacts.',
          'Cloud-hosted services and APIs that support repeatable, data-driven workflows.',
          'Contributed to PLRB’s 2025 Esri Special Achievement in GIS Award.',
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
        'Built and operated field-sensing systems and automated data pipelines that transformed raw observations into quality-controlled geospatial analyses for research teams.',
      keyContribution:
        'Co-engineered Corteva’s Smartstick proof of concept, processed measurements from seven research sites, and compared selected field datasets with drone imagery and LiDAR.',
      caseStudy: {
        overview:
          'At Corteva, I built and operated field-sensing systems and the processing workflows that turned raw observations into quality-controlled geospatial analyses for research teams.',
        examples: [
          'Built systems ranging from a gold-standard automated weather station and custom N₂O soil-gas flux chambers to hundreds of infrared radiometers deployed across the Americas.',
          'Developed Python and ArcPy pipelines for quality control, spatial assignment, analysis, visualization, and delivery.',
          'Co-engineered the Smartstick mobile sensing platform; processed measurements from seven research sites and compared selected field datasets with drone imagery and LiDAR.',
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
        'Studied how historical land-use change affected Midwest rainfall and mesoscale convective systems using WRF and Noah-MP simulations.',
      keyContribution:
        'Research output: a M.S. thesis combining atmospheric modeling, geospatial data preparation, and analysis of ERA5, CESM, WRF, and observational datasets.',
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
        'Conducted boundary-layer meteorology research under Dr. Ian Williams at Iowa State University. Focused on case identification and scientific visualization.',
      keyContribution:
        'Research contribution: produced case-based plots and visualizations that supported an ongoing research effort, later carried forward by an incoming graduate student.',
      caseStudy: {
        overview:
          'My undergraduate research focused on boundary-layer meteorology under the guidance of Dr. Ian Williams at Iowa State University. This was separate from my senior thesis on extreme convective wind in Iowa.',
        examples: [
          'Identified relevant cases for further meteorological analysis.',
          'Generated scientific plots and visualizations to support interpretation of findings.',
          'Contributed research that was later carried forward by an incoming graduate student.',
        ],
      },
      tech: ['Boundary-layer meteorology', 'Case identification', 'Data visualization', 'Research collaboration'],
      links: [],
    },
  ] as Project[],

  experience: [
    {
      organization: 'Property & Liability Resource Bureau',
      role: 'Meteorologist — Weather & Catastrophe Analyst',
      period: '2025 — Present',
    },
    {
      organization: 'Corteva Agriscience',
      role: 'Field Sensing Research Associate',
      period: '2024',
    },
    {
      organization: 'Iowa State University',
      role: 'Graduate Research Assistant',
      period: '2022 — 2024',
    },
    {
      organization: 'Iowa State University',
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
    'I welcome conversations about roles involving meteorology, geospatial data, environmental analysis, scientific computing, automation, research, or related work. Reach me at dylanddermott@gmail.com or via LinkedIn.',
}
