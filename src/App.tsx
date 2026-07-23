import { lazy, Suspense, useEffect, useState } from 'react'
import { CaseStudyFooter } from './components/CaseStudyFooter'
import { ProfessionalCaseStudyPage } from './components/ProfessionalCaseStudyPage'
import { portfolio } from './data/portfolio'
import { getRouteState, caseStudyUrl } from './utils/routes'

// Lazy so the Cesium chunk never blocks the hero copy / CTA paint.
const WeatherGlobe = lazy(() => import('./components/WeatherGlobe'))

// Standalone page (not backed by portfolio.projects) reachable at /work/<slug>/.
const TECHNICAL_PROJECT_EXAMPLE_SLUG = 'technical-project-example'

const navItems = [
  { label: 'Work', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
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
          <CaseStudyFooter
            base={base}
            next={{ label: 'Browse all work', href: `${base}#projects` }}
          />
        </div>
      </main>
    )
  }

  if (project.slug === 'plrb-weather-systems' || project.slug === 'corteva-field-sensing') {
    return <ProfessionalCaseStudyPage slug={project.slug} base={base} />
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
          <h2 id="work-examples-heading">Work examples</h2>
          <ul>
            {project.caseStudy.examples.map((example) => <li key={example}>{example}</li>)}
          </ul>
        </section>

        <ul className="tech-list" aria-label="Technologies">
          {project.tech.map((tech) => <li key={tech}>{tech}</li>)}
        </ul>

        {project.slug === 'plrb-weather-systems' && <ProjectScreenshot />}

        <CaseStudyFooter
          base={base}
          next={{ label: 'Browse all work', href: `${base}#projects` }}
        />
      </div>
    </main>
  )
}

function TechnicalProjectExamplePage({ base }: { base: string }) {
  return (
    <main className="case-study-page">
      <div className="container case-study-container">
        <a className="text-link case-study-back" href={base}>
          ← Back to portfolio
        </a>
        <h1>Technical Project Example</h1>
        {/* Intentionally blank for now — content to come. */}
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

  // Redirect legacy ?work=slug URLs to the new path-based routes
  useEffect(() => {
    const legacySlug = new URLSearchParams(window.location.search).get('work')
    if (!legacySlug) return

    const projectExists = portfolio.projects.some(
      (project) => project.slug === legacySlug,
    )
    if (projectExists) {
      window.location.replace(caseStudyUrl(legacySlug))
    }
  }, [])

  const routeState = getRouteState()

  if (routeState.type === 'not-found') {
    // Relying on public/404.html for direct navigation, but handling soft 404s here
    return (
      <main className="case-study-page">
        <div className="container case-study-container">
          <h1>404 - Not Found</h1>
          <p>The case study you are looking for does not exist.</p>
          <a className="button button-primary" href={base} style={{ marginTop: '2rem', display: 'inline-block' }}>
            Back to portfolio
          </a>
        </div>
      </main>
    )
  }

  if (routeState.type === 'case-study') {
    if (routeState.slug === TECHNICAL_PROJECT_EXAMPLE_SLUG) {
      return <TechnicalProjectExamplePage base={base} />
    }

    const caseStudy = portfolio.projects.find((project) => project.slug === routeState.slug)
    if (caseStudy) {
      return <CaseStudyPage project={caseStudy} base={base} thesisUrl={thesisUrl} />
    }
    // Handle invalid case study slug
    return (
      <main className="case-study-page">
        <div className="container case-study-container">
          <h1>404 - Not Found</h1>
          <p>The case study "{routeState.slug}" does not exist.</p>
          <a className="button button-primary" href={base} style={{ marginTop: '2rem', display: 'inline-block' }}>
            Back to portfolio
          </a>
        </div>
      </main>
    )
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
                width="132"
                height="132"
              />
              <h1>{portfolio.name}</h1>
              <p className="hero-role">{portfolio.role}</p>
              <p className="hero-statement">{portfolio.heroStatement}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#projects">
                  Work Examples <ArrowIcon />
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
              </div>
              <p className="hero-tagline">{portfolio.tagline}</p>
            </div>
            <Suspense fallback={<div className="globe-wrap" aria-hidden="true" />}>
              <WeatherGlobe />
            </Suspense>
          </div>
          {/* Soft fade at the bottom of the hero so the growing globe blends
              into the Work Examples section instead of being cut off abruptly. */}
          <div className="hero-fade" aria-hidden="true" />
        </section>

        {/* WORK EXAMPLES */}
        <section className="section" id="projects">
          <div className="container">
            <div className="selected-work-content">
              <h2>Work</h2>
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
                        <p>{project.outcomes.length === 1 ? 'Highlighted contribution' : 'Selected contributions'}</p>
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
                    {project.slug !== 'boundary-layer-research' && (
                      <a className="text-link project-case-link" href={caseStudyUrl(project.slug)}>
                        View Work Examples <ArrowIcon />
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

              <a
                className="project-strip"
                href={caseStudyUrl(TECHNICAL_PROJECT_EXAMPLE_SLUG)}
              >
                <span className="project-strip-label">
                  <span className="project-kind">Walkthrough</span>
                  <span className="project-strip-title">Technical Project Example</span>
                </span>
                <span className="project-strip-cta">
                  View <ArrowIcon />
                </span>
              </a>
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
                  <h3>{item.role}</h3>
                  <p className="experience-org">{item.organization}</p>
                  <p className="experience-scope">{item.scope}</p>
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
