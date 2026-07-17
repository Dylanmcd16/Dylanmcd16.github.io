import { lazy, Suspense, useEffect, useState } from 'react'
import { portfolio } from './data/portfolio'

// Lazy so the Cesium chunk never blocks the hero copy / CTA paint.
const WeatherGlobe = lazy(() => import('./components/WeatherGlobe'))

const navItems = [
  { label: 'Work', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
]

const careerTimeline = [
  { organization: 'PLRB', period: '2025–Present' },
  { organization: 'Corteva', period: '2024–2025' },
  { organization: "Iowa State University Master's Research", period: '2022–2024' },
  { organization: 'Iowa State University Undergraduate Research', period: '2022–2024' },
]

// ---- Icons ----------------------------------------------------------------

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="icon">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="icon">
      <path d="M7 5h8v8M15 5 6 14" />
    </svg>
  )
}

function ProjectScreenshot() {
  return (
    <div className="project-screenshot">
      <img
        src={`${import.meta.env.BASE_URL}Screenshot 2026-07-17 154353.png`}
        alt="LinkedIn post announcing PLRB's 2025 Esri Special Achievement in GIS Award"
      />
    </div>
  )
}

function CaseStudyPage({
  project,
  base,
  thesisUrl,
}: {
  project: (typeof portfolio.projects)[number]
  base: string
  thesisUrl: string
}) {
  if (project.slug === 'land-use-convective-weather') {
    return (
      <main className="case-study-page thesis-reader-page">
        <div className="container case-study-container">
          <a className="text-link case-study-back" href={base}>
            ← Back to portfolio
          </a>
          <h1>Master&apos;s Thesis – Iowa State University</h1>
          <p className="thesis-reader-description">
            A study of how historical U.S. land-use change influenced Midwest rainfall and mesoscale convective systems.
          </p>
          <iframe
            className="thesis-reader"
            src={thesisUrl}
            title="M.S. thesis: Impacts of U.S. Deforestation on Rainfall from Mesoscale Convective Systems"
          />
        </div>
      </main>
    )
  }

  return (
    <main className="case-study-page">
      <div className="container case-study-container">
        <a className="text-link case-study-back" href={base}>
          ← Back to portfolio
        </a>
        <p className="project-kind">{project.kind}</p>
        <h1>{project.title}</h1>
        <p className="case-study-overview">{project.caseStudy.overview}</p>

        <section className="case-study-examples" aria-labelledby="work-examples-heading">
          <h2 id="work-examples-heading">Selected work examples</h2>
          <ul>
            {project.caseStudy.examples.map((example) => <li key={example}>{example}</li>)}
          </ul>
        </section>

        <ul className="tech-list" aria-label="Technologies">
          {project.tech.map((tech) => <li key={tech}>{tech}</li>)}
        </ul>

        {project.slug === 'plrb-weather-systems' && <ProjectScreenshot />}
      </div>
    </main>
  )
}

// ---- Header ---------------------------------------------------------------

function Header({ resumeUrl }: { resumeUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-inner">
        <a className="brand" href="#top">
          {portfolio.name}
        </a>

        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span />
          <span />
        </button>

        <nav
          id="site-navigation"
          className={`site-nav ${menuOpen ? 'is-open' : ''}`}
          aria-label="Primary"
        >
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <a
            className="nav-resume"
            href={resumeUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            View Résumé
          </a>
        </nav>
      </div>
    </header>
  )
}

// ---- Page -----------------------------------------------------------------

function App() {
  const base = import.meta.env.BASE_URL
  const resumeUrl = `${base}${portfolio.resumeFile}`
  const thesisUrl = `${base}${portfolio.thesisFile}`
  const caseStudySlug = new URLSearchParams(window.location.search).get('work')
  const caseStudy = portfolio.projects.find((project) => project.slug === caseStudySlug)

  if (caseStudy) {
    return <CaseStudyPage project={caseStudy} base={base} thesisUrl={thesisUrl} />
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header resumeUrl={resumeUrl} />

      <main id="main-content">
        {/* HERO */}
        <section className="hero" id="top">
          <div className="container hero-inner">
            <div className="hero-copy">
              <img
                className="hero-photo"
                src={`${base}${portfolio.photo}`}
                alt={`Portrait of ${portfolio.name}`}
                width="112"
                height="112"
              />
              <h1>{portfolio.name}</h1>
              <p className="hero-role">{portfolio.role}</p>
              <p className="hero-statement">{portfolio.heroStatement}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#projects">
                  Selected Work <ArrowIcon />
                </a>
                <a className="button button-secondary" href={resumeUrl} target="_blank" rel="noreferrer">
                  View Résumé
                </a>
                <a
                  className="button button-secondary"
                  href={portfolio.links.linkedin}
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
                <a
                  className="button button-secondary"
                  href={portfolio.links.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </div>
              <p className="hero-tagline">{portfolio.tagline}</p>
            </div>
            <Suspense fallback={<div className="globe-wrap" aria-hidden="true" />}>
              <WeatherGlobe />
            </Suspense>
          </div>
          {/* Soft fade at the bottom of the hero so the growing globe blends
              into the Selected Work section instead of being cut off abruptly. */}
          <div className="hero-fade" aria-hidden="true" />
        </section>

        {/* SELECTED WORK */}
        <section className="section" id="projects">
          <div className="container selected-work-layout">
            <aside className="career-timeline" aria-label="Career timeline">
              <p className="career-timeline-label">Career timeline</p>
              <ol>
                {careerTimeline.map((item) => (
                  <li key={item.organization}>
                    <span className="career-timeline-marker" aria-hidden="true" />
                    <div>
                      <strong>{item.organization}</strong>
                      <span>{item.period}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="selected-work-content">
              <h2>Selected Work</h2>
              <div className="project-grid">
              {portfolio.projects.map((project) => (
                <article
                  key={project.title}
                  className={`project project--${project.accent} ${project.featured ? 'is-featured' : ''}`}
                >
                  <div className="project-body">
                    <p className="project-kind">{project.kind}</p>
                    <h3>{project.title}</h3>
                    <p className="project-description">{project.description}</p>
                    {project.featured && project.outcomes && (
                      <div className="project-outcomes">
                        <p>Selected contributions</p>
                        <ul>
                          {project.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
                        </ul>
                      </div>
                    )}
                    {!project.featured && project.keyContribution && (
                      <p className="project-contribution">{project.keyContribution}</p>
                    )}
                    <ul className="tech-list" aria-label="Technologies">
                      {project.tech.map((tech) => (
                        <li key={tech}>{tech}</li>
                      ))}
                    </ul>
                    {project.slug !== 'extreme-convective-wind' && (
                      <a className="text-link project-case-link" href={`${base}?work=${project.slug}`}>
                        View Work Example <ArrowIcon />
                      </a>
                    )}
                    {project.links.length > 0 && (
                      <div className="project-links">
                        {project.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-link"
                          >
                            {link.label} <ExternalIcon />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {project.featured && <ProjectScreenshot />}
                </article>
              ))}
              </div>
            </div>
          </div>
        </section>

        {/* EXPERIENCE */}
        <section className="section" id="experience">
          <div className="container">
            <h2>Experience</h2>
            <div className="experience-list">
              {portfolio.experience.map((item) => (
                <article className="experience" key={`${item.organization}-${item.role}`}>
                  <div>
                    <h3>{item.role}</h3>
                    <p className="experience-org">{item.organization}</p>
                  </div>
                  <p className="experience-summary">{item.summary}</p>
                  <p className="experience-period">{item.period}</p>
                </article>
              ))}
            </div>

            <h2 className="education-heading">Education</h2>
            <div className="education-list">
              {portfolio.education.map((item) => (
                <article className="education" key={item.degree}>
                  <div>
                    <h3>{item.degree}</h3>
                    <p className="education-work">
                      {item.workLabel}: {item.work}
                    </p>
                    {item.degree.startsWith('M.S.') && (
                      <a
                        className="text-link education-link"
                        href={thesisUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read the thesis <ExternalIcon />
                      </a>
                    )}
                  </div>
                  <p className="education-year">{item.year}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SKILLS + EDUCATION */}
        <section className="section" id="skills">
          <div className="container">
            <h2>Skills</h2>
            <div className="skills-grid">
              {portfolio.skills.map((group) => (
                <div className="skill-group" key={group.title}>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* CONTACT */}
        <section className="section section-contact" id="contact">
          <div className="container">
            <h2>Contact</h2>
            <p className="contact-lead">{portfolio.contactLead}</p>
            <div className="contact-actions">
              <a className="button button-primary" href={`mailto:${portfolio.email}`}>
                Email Dylan <ArrowIcon />
              </a>
              <a
                className="button button-secondary"
                href={portfolio.links.linkedin}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn <ExternalIcon />
              </a>
              <a
                className="button button-secondary"
                href={portfolio.links.github}
                target="_blank"
                rel="noreferrer"
              >
                GitHub <ExternalIcon />
              </a>
              <a className="button button-secondary" href={resumeUrl} target="_blank" rel="noreferrer">
                Download Résumé
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <p>
            © {new Date().getFullYear()} {portfolio.name} · {portfolio.location}
          </p>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </>
  )
}

export default App
