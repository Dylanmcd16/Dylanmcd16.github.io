import { portfolio } from '../data/portfolio'

export type NextAction = {
  label: string
  href: string
}

/**
 * Closing actions for every case-study page: an onward link, résumé, and
 * contact. Shared so the professional, thesis, and research pages all end the
 * same way instead of dead-ending on "Back to portfolio".
 */
export function CaseStudyFooter({ base, next }: { base: string; next: NextAction }) {
  return (
    <section className="case-next" aria-labelledby="case-next-title">
      <div>
        <p className="case-kicker">Next</p>
        <h2 id="case-next-title">Keep going</h2>
      </div>
      <div className="case-next-actions">
        <a className="button button-primary" href={next.href}>
          {next.label}
        </a>
        <a
          className="button button-secondary"
          href={`${base}${portfolio.resumeFile}`}
          target="_blank"
          rel="noreferrer"
        >
          View résumé
        </a>
        <a className="button button-secondary" href={`mailto:${portfolio.email}`}>
          Contact Dylan
        </a>
      </div>
      <a className="text-link case-study-footer-link" href={base}>
        Back to portfolio
      </a>
    </section>
  )
}
