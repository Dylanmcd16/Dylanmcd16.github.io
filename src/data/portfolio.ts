// ---------------------------------------------------------------------------
// Portfolio content. Edit this file to change almost all visible text.
// ---------------------------------------------------------------------------

// Announcement post for the 2025 Esri SAG Award, linked from both the homepage
// screenshot and the PLRB case study.
export const ESRI_SAG_AWARD_POST_URL =
  'https://www.linkedin.com/posts/dylan-mcdermott-193b18174_plrb-esri-sagawards-activity-7384242498338172929-TbnD'

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
  // Descriptive link text: clearer than a repeated "View Work Examples" when
  // assistive tech lists links out of context. Omit to hide the link.
  caseStudyLabel?: string
  // Row copy for the /work/ index. Its job is scanning, not explaining, so the
  // summary stays near 20 words — deliberately shorter than the case-study
  // overview. The index carries no technology pills; `tech` is for the
  // homepage cards and case studies. Omit to leave a role off the index.
  workIndex?: {
    organization: string
    period: string
    summary: string
    linkLabel: string
    // Decorative strip revealed on row hover. Pre-cropped to 840×168 in
    // /public/work-index so the index doesn't pull the multi-megabyte
    // originals the case studies use.
    image: string
  }
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

// An index, not a case study: this section says what Dylan can do and which
// technologies he knows. Where he used them, what he built, and why it
// mattered is the Work section's job — so no employers, evidence lines, or
// per-card links here, and no proficiency bars or ratings anywhere.
export type SkillGroup = {
  title: string
  strengths: string
  tools: string[]
}

export type AwardItem = {
  title: string
  issuer: string
  year: string
  description: string
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
  location: 'West Des Moines, Iowa',
  email: 'dylanddermott@gmail.com',
  resumeFile: 'resume.pdf',
  thesisFile: 'McDermott_iastate_0097M_21473.pdf',
  photo: 'photo-avatar.jpg',

  heroStatement:
    'I am a meteorologist, scientific researcher, and technical problem solver with an M.S. in Meteorology. I enjoy investigating complex scientific questions, working with environmental and geospatial data, and developing practical solutions through programming, analysis, and automation. My experience spans atmospheric research, agriculture research, geospatial technology, weather-data systems, and the development of tools that make scientific information more useful.',

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
        'Automate weather-data pipelines and build claims-facing ArcGIS applications that keep multi-source catastrophe evidence validated, synchronized, and ready for daily use.',
      outcomes: [
        'Automated daily ingestion, validation, reconciliation, and publication of national weather and hazard data.',
        'Built ArcGIS services and JavaScript tools for querying and integrating weather evidence.',
        'Contributed to PLRB’s 2025 Esri Special Achievement in GIS Award.',
      ],
      workIndex: {
        organization: 'PLRB',
        period: '2025 — Present',
        summary:
          'Production weather systems, automated geospatial processing, event verification, and catastrophe analysis.',
        linkLabel: 'Explore PLRB work',
        image: 'work-index/plrb-weather-systems.jpg',
      },
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
      caseStudyLabel: 'View PLRB work',
      links: [],
    },
    {
      slug: 'corteva-field-sensing',
      title: 'Field Sensing Research Associate',
      kind: 'Corteva Agriscience · 2024',
      accent: 'field',
      description:
        'Built the Python and ArcPy pipeline behind a GPS-linked field-sensing platform used across seven research sites, saving approximately 100 processing hours and producing quality-controlled plot-level analyses.',
      workIndex: {
        organization: 'Corteva Agriscience',
        period: '2024',
        summary:
          'Field-sensing systems, sensor-data processing, quality control, and plot-level geospatial analysis for agricultural research.',
        linkLabel: 'Explore Corteva work',
        image: 'work-index/corteva-field-sensing.jpg',
      },
      caseStudy: {
        overview:
          'At Corteva, I built and operated field-sensing systems and independently developed the processing workflows that turned their raw observations into plot-level geospatial analyses for research teams.',
        examples: [
          'Built systems ranging from a gold-standard automated weather station and custom N₂O soil-gas flux chambers to hundreds of infrared radiometers deployed across the Americas.',
          'Built the Python and ArcPy pipeline that validated, spatially assigned, visualized, and delivered Smartstick measurements from seven research sites; compared selected results with drone imagery and LiDAR.',
        ],
      },
      tech: ['Python', 'ArcPy', 'Field sensing', 'Spatial analysis'],
      caseStudyLabel: 'View field-sensing work',
      links: [],
    },
    {
      slug: 'land-use-convective-weather',
      title: 'Land-Use Effects on Convective Weather',
      kind: 'Iowa State · M.S. Research · 2022–2024',
      accent: 'modeling',
      description:
        'Ran multi-resolution WRF and Noah-MP experiments comparing present-day and 1850 vegetation scenarios to quantify effects on Midwest rainfall, surface fluxes, moisture transport, and mesoscale convective systems.',
      keyContribution:
        'Produced an M.S. thesis combining atmospheric modeling, geospatial data preparation, and analysis of ERA5, CESM, WRF, and observational datasets.',
      workIndex: {
        organization: 'Iowa State University',
        period: '2022 — 2024',
        summary:
          'Graduate research combining numerical weather modeling, land-surface simulations, and geospatial analysis.',
        linkLabel: 'Explore Iowa State research',
        image: 'work-index/land-use-convective-weather.jpg',
      },
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
      caseStudyLabel: 'View modeling research',
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
      title: 'Geospatial Systems',
      strengths:
        'GIS automation, spatial and raster analysis, remote sensing, web GIS publishing, and field-sensor data workflows',
      tools: [
        'ArcGIS Pro',
        'ArcGIS Enterprise / Online',
        'ArcPy',
        'Experience Builder',
        'GeoPandas',
        'Rasterio',
        'LiDAR',
        'Drone imagery',
      ],
    },
    {
      title: 'Meteorology & Modeling',
      strengths:
        'Radar and severe-weather analysis, numerical weather prediction, atmospheric modeling, and land-surface modeling',
      tools: ['WRF', 'Noah-MP', 'NEXRAD / MRMS', 'GOES / MODIS', 'ERA5', 'CESM'],
    },
    {
      title: 'Data Engineering & Software',
      strengths:
        'Automated data pipelines, data quality control and reconciliation, API integration, cloud-hosted services, and scientific web applications',
      tools: [
        'Python',
        'pandas / xarray',
        'NetCDF / GRIB / GeoTIFF',
        'REST APIs',
        'AWS',
        'SQL / PostgreSQL',
        'FastAPI',
        'React / TypeScript',
      ],
    },
  ] satisfies SkillGroup[],

  // A working method rather than a skill category, so it sits below the cards
  // as its own labelled note instead of becoming a chip or a fourth card.
  skillsNote: {
    label: 'AI-assisted work',
    body: 'I’m highly experienced in using generative AI responsibly to assist with research, coding, debugging, and technical problem-solving, while independently verifying information, testing outputs, and applying my own judgment to the final work.',
  },

  awards: [
    {
      title: 'Esri Special Achievement in GIS (SAG) Award',
      issuer: 'Esri · PLRB',
      year: '2025',
      description:
        'Awarded to PLRB for innovative use of GIS technology. I contributed the catastrophe analytics workflows and ArcGIS applications recognized by the award.',
    },
    {
      title: 'AWS 10,000 AIdeas Competition — Semi-Finalist',
      issuer: 'Amazon Web Services',
      year: '2025',
      description:
        'Recognized for an independently built AI-driven weather intelligence platform that integrates over 200 environmental data streams into source-backed analyses.',
    },
  ] satisfies AwardItem[],

  education: [
    {
      degree: 'M.S. in Meteorology — Iowa State University',
      year: '2024',
      workLabel: 'Thesis',
      work: 'Impacts of US Deforestation on Rainfall from Mesoscale Convective Systems',
    },
    {
      degree: 'B.S. in Meteorology — Iowa State University',
      year: '2022',
      workLabel: 'Senior thesis',
      work: 'Extreme Convective Wind Magnitude and Duration in Iowa',
    },
  ] satisfies EducationItem[],

}
