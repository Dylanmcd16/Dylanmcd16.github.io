import { portfolio } from '../data/portfolio'
import { caseStudyUrl } from '../utils/routes'

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="icon">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

// flatMap rather than filter so the row copy is non-optional downstream; a role
// without a workIndex block simply doesn't belong on the index.
const roles = portfolio.projects.flatMap((project) =>
  project.workIndex ? [{ ...project, workIndex: project.workIndex }] : [],
)

/**
 * The "Work" destination in the header. An index, not three miniature landing
 * pages: one scannable row per role, and the whole row is the link. Detail
 * belongs on the case studies it points at.
 */
export function WorkIndexPage({ base }: { base: string }) {
  return (
    <main className="case-study-page work-index-page">
      <div className="container work-index-container">
        <a className="text-link case-study-back" href={base}>
          ← Back to portfolio
        </a>
        <h1>Work by role</h1>
        <p className="work-index-intro">
          The projects in this portfolio come from operational weather and geospatial work
          at PLRB, field-sensing research at Corteva, and atmospheric modeling research at
          Iowa State.
        </p>

        <ul className="work-index-list">
          {roles.map((role) => (
            <li className="work-row" key={role.slug}>
              <div className="work-row-meta">
                <span className="work-row-org">{role.workIndex.organization}</span>
                <span className="work-row-period">{role.workIndex.period}</span>
              </div>

              <div className="work-row-main">
                <h2>{role.title}</h2>
                <p>{role.workIndex.summary}</p>
              </div>

              {/* One link per row, stretched over the whole row by ::after —
                  the row stays clickable without nesting interactive elements
                  or duplicating the destination. */}
              <a className="work-row-link" href={caseStudyUrl(role.slug)}>
                {role.workIndex.linkLabel} <ArrowIcon />
              </a>

              {/* Decorative: the case study carries these images with real
                  captions, so the hover strip is hidden from assistive tech
                  rather than announced as an unlabelled figure. */}
              <div className="work-row-media" aria-hidden="true">
                <img
                  src={`${base}${role.workIndex.image}`}
                  alt=""
                  width="720"
                  height="240"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </li>
          ))}
        </ul>

        <section className="work-index-next" aria-labelledby="work-next-title">
          <h2 id="work-next-title" className="case-kicker">
            Explore more
          </h2>
          <a
            className="work-next-feature"
            href={`${base}projects/iowa-severe-weather-explorer/`}
          >
            <span className="work-next-feature-title">
              Iowa Severe Weather Explorer <ArrowIcon />
            </span>
            <span className="work-next-feature-sub">
              Interactive maps and analysis of historical severe-weather events across Iowa.
            </span>
          </a>
          <div className="work-next-links">
            <a href={`${base}${portfolio.resumeFile}`} target="_blank" rel="noreferrer">
              Résumé
            </a>
            <a href={`mailto:${portfolio.email}`}>Contact</a>
            <a href={base}>Back to portfolio</a>
          </div>
        </section>
      </div>
    </main>
  )
}
