export type LinkItem = {
  label: string
  href: string
}

export type Project = {
  number: string
  title: string
  category: string
  summary: string
  details: string
  tags: string[]
  href?: string
}

export type Experience = {
  organization: string
  role: string
  period: string
  summary: string
}

export type ResearchItem = {
  degree: string
  title: string
  summary: string
}

// Edit this file to customize almost all visible text on the site.
export const portfolio = {
  name: 'Dylan McDermott M.S. Meteorology',
  initials: 'DM',
  eyebrow: 'Meteorology · Geospatial Data · Technology',
  introduction:
    'I’m a meteorologist with an M.S. in Meteorology, working at the intersection of science, spatial data, and technology.',
  about:
    'My experience includes meteorological research, weather and catastrophe analysis, automation, ArcGIS, geospatial data analytics, remote sensing, and field-sensing research.',
  location: 'West Des Moines, Iowa',
  email: 'dylanddermott@gmail.com',
  resumeFile: 'resume.pdf',
  links: [
    { label: 'GitHub', href: 'https://github.com/Dylanmcd16' },
    { label: 'Atmosky', href: 'https://atmoskyai.com' },
    // Add your full LinkedIn URL here when ready:
    // { label: 'LinkedIn', href: 'https://www.linkedin.com/in/your-profile/' },
  ] satisfies LinkItem[],
  strengths: [
    'Atmospheric science',
    'Geospatial analytics',
    'Python automation',
    'ArcGIS',
    'Remote sensing',
    'Scientific software',
  ],
  projects: [
    {
      number: '01',
      title: 'Atmosky AI',
      category: 'Independent product',
      summary:
        'An AI weather-intelligence platform built to answer location- and time-specific questions with supporting maps, data, and evidence.',
      details:
        'The project combines weather and geospatial data services with automated planning, analysis, and presentation workflows.',
      tags: ['React', 'TypeScript', 'Python', 'FastAPI', 'Geospatial APIs'],
      href: 'https://atmoskyai.com',
    },
    {
      number: '02',
      title: 'Weather & Catastrophe Analytics',
      category: 'Operational analytics',
      summary:
        'Automated workflows and geospatial products used to analyze severe weather, catastrophe events, and related environmental information.',
      details:
        'Work includes data processing, quality control, reporting, ArcGIS applications, and operational weather analysis.',
      tags: ['Python', 'ArcGIS', 'Automation', 'Weather data'],
    },
    {
      number: '03',
      title: 'Field-Sensing Research',
      category: 'Research and development',
      summary:
        'Field data-collection, sensing, and processing work supporting research operations and spatial analysis.',
      details:
        'Contributions included mobile data-collection systems, automated processing, quality control, and cross-functional research support.',
      tags: ['Field sensing', 'Data pipelines', 'Quality control', 'R&D'],
    },
    {
      number: '04',
      title: 'Convective Weather Research',
      category: 'Academic research',
      summary:
        'Research focused on severe convective winds and the response of mesoscale convective systems to land-use change.',
      details:
        'This work combined atmospheric science, numerical modeling, data analysis, and scientific communication.',
      tags: ['Meteorology', 'WRF', 'Python', 'Scientific analysis'],
    },
  ] satisfies Project[],
  experience: [
    {
      organization: 'Property & Liability Resource Bureau',
      role: 'Weather & Catastrophe Analyst',
      period: '2025 — Present',
      summary:
        'Develop and maintain weather and geospatial workflows, operational analyses, ArcGIS products, and automated reporting systems.',
    },
    {
      organization: 'Corteva Agriscience',
      role: 'Field Sensing Research Associate (Contract)',
      period: '2024',
      summary:
        'Supported field-sensing research, mobile data collection, quality control, automated processing, and research operations.',
    },
    {
      organization: 'Iowa State University',
      role: 'Graduate Researcher',
      period: '2022 — 2024',
      summary:
        'Conducted atmospheric-science research involving mesoscale convective systems, land-use change, modeling, and data analysis.',
    },
  ] satisfies Experience[],
  research: [
    {
      degree: 'M.S. Meteorology',
      title: 'Responses of Mesoscale Convective Systems to Land-Use Change',
      summary:
        'Examined how modifications to the land surface influence the evolution and behavior of organized convective systems.',
    },
    {
      degree: 'B.S. Meteorology',
      title: 'Extreme Convective Wind Magnitude and Duration in Iowa',
      summary:
        'Investigated the magnitude, duration, and characteristics of extreme convective wind events across Iowa.',
    },
  ] satisfies ResearchItem[],
}
