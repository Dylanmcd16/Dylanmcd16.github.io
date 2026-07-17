import { useEffect, useState } from 'react'
import { portfolio } from './data/portfolio'

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Experience', href: '#experience' },
  { label: 'Research', href: '#research' },
  { label: 'Contact', href: '#contact' },
]

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M7 5h8v8M15 5 6 14M13 10v5H5V7h5" />
    </svg>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="header-inner">
        <a className="brand" href="#top" aria-label="Return to top">
          <span>{portfolio.initials}</span>
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
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}

function DataGraphic() {
  return (
    <div className="data-graphic" aria-hidden="true">
      <div className="graphic-topline">
        <span>ENVIRONMENTAL DATA</span>
        <span>41.6°N / 93.7°W</span>
      </div>
      <svg viewBox="0 0 600 430" role="presentation">
        <defs>
          <linearGradient id="fade" x1="0" x2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="0.5" stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
          </linearGradient>
          <radialGradient id="cell" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#7be0e2" stopOpacity="0.7" />
            <stop offset="1" stopColor="#7be0e2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="grid-lines">
          {Array.from({ length: 9 }).map((_, index) => (
            <line key={`v-${index}`} x1={75 * index} y1="0" x2={75 * index} y2="430" />
          ))}
          {Array.from({ length: 7 }).map((_, index) => (
            <line key={`h-${index}`} x1="0" y1={72 * index} x2="600" y2={72 * index} />
          ))}
        </g>
        <circle cx="365" cy="190" r="105" fill="url(#cell)" />
        <g className="contours">
          <path d="M-25 303C71 250 113 306 194 270s89-113 178-108 84 89 164 68 88-82 126-74" />
          <path d="M-16 335c92-51 145 8 224-29s83-108 170-105 90 85 169 62 80-72 126-63" />
          <path d="M-30 251c98-52 133 5 211-29s96-116 184-112 94 86 171 62 74-68 128-66" />
          <path d="M67 96c58-33 113-21 148 12s65 45 111 23 91-34 135 9 86 45 136 16" />
        </g>
        <path className="track" d="M96 322C181 293 240 248 304 212s127-72 206-104" />
        <g className="track-points">
          <circle cx="96" cy="322" r="5" />
          <circle cx="202" cy="274" r="5" />
          <circle cx="304" cy="212" r="7" />
          <circle cx="405" cy="159" r="5" />
          <circle cx="510" cy="108" r="5" />
        </g>
        <line className="scan-line" x1="40" y1="374" x2="560" y2="374" stroke="url(#fade)" />
      </svg>
      <div className="graphic-readout">
        <span><b>06</b> data layers</span>
        <span><b>24</b> automated workflows</span>
        <span><b>01</b> clear result</span>
      </div>
    </div>
  )
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="section-heading">
      <span>{index}</span>
      <h2>{title}</h2>
      <div />
    </div>
  )
}

function App() {
  const resumeUrl = `${import.meta.env.BASE_URL}${portfolio.resumeFile}`

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />

      <main id="main-content">
        <section className="hero" id="top">
          <div className="ambient-grid" />
          <div className="container hero-layout">
            <div className="hero-copy">
              <p className="eyebrow">{portfolio.eyebrow}</p>
              <h1>{portfolio.name}</h1>
              <p className="hero-headline">{portfolio.headline}</p>
              <p className="hero-introduction">{portfolio.introduction}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#work">
                  View selected work <ArrowIcon />
                </a>
                <a className="button button-secondary" href={`mailto:${portfolio.email}`}>
                  Contact me
                </a>
              </div>
            </div>
            <DataGraphic />
          </div>
          <div className="container hero-meta">
            <span>{portfolio.location}</span>
            <span>Atmospheric science · GIS · software</span>
          </div>
        </section>

        <section className="section" id="about">
          <div className="container">
            <SectionHeading index="01" title="About" />
            <div className="about-layout">
              <p className="about-statement">{portfolio.about}</p>
              <div className="strength-list" aria-label="Areas of expertise">
                {portfolio.strengths.map((strength, index) => (
                  <div key={strength}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section section-dark" id="work">
          <div className="container">
            <SectionHeading index="02" title="Selected work" />
            <div className="project-list">
              {portfolio.projects.map((project) => {
                const content = (
                  <>
                    <div className="project-number">{project.number}</div>
                    <div className="project-main">
                      <p className="project-category">{project.category}</p>
                      <h3>{project.title}</h3>
                      <p className="project-summary">{project.summary}</p>
                      <p className="project-details">{project.details}</p>
                      <div className="tag-list">
                        {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                    </div>
                    <div className="project-arrow">
                      {project.href ? <ExternalIcon /> : <ArrowIcon />}
                    </div>
                  </>
                )

                return project.href ? (
                  <a
                    className="project-card"
                    key={project.title}
                    href={project.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {content}
                  </a>
                ) : (
                  <article className="project-card" key={project.title}>
                    {content}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="section" id="experience">
          <div className="container">
            <SectionHeading index="03" title="Experience" />
            <div className="timeline">
              {portfolio.experience.map((item) => (
                <article className="timeline-item" key={`${item.organization}-${item.role}`}>
                  <p className="timeline-period">{item.period}</p>
                  <div>
                    <p className="timeline-organization">{item.organization}</p>
                    <h3>{item.role}</h3>
                    <p>{item.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section research-section" id="research">
          <div className="container">
            <SectionHeading index="04" title="Research" />
            <div className="research-grid">
              {portfolio.research.map((item) => (
                <article className="research-card" key={item.title}>
                  <p>{item.degree}</p>
                  <h3>{item.title}</h3>
                  <span />
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="container contact-layout">
            <div>
              <p className="eyebrow">Contact</p>
              <h2>Let’s discuss weather, geospatial data, or scientific technology.</h2>
            </div>
            <div className="contact-actions">
              <a className="contact-email" href={`mailto:${portfolio.email}`}>
                {portfolio.email} <ArrowIcon />
              </a>
              <div className="social-links">
                {portfolio.links.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                    {link.label} <ExternalIcon />
                  </a>
                ))}
                <a href={resumeUrl} target="_blank" rel="noreferrer">
                  Résumé <ExternalIcon />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <p>© {new Date().getFullYear()} {portfolio.name}</p>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </>
  )
}

export default App
