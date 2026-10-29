import { CaseStudyFooter } from './CaseStudyFooter'
import { workIndexUrl } from '../utils/routes'
import './DopplerAtlasPage.css'

const website = 'https://doppleratlas.app/'

export function DopplerAtlasPage({ base }: { base: string }) {
  return (
    <main className="atlas-page">
      <div className="atlas-container">
        <nav className="atlas-nav" aria-label="Project navigation">
          <a href={base}>← Back to portfolio</a>
          <span>Dylan McDermott <span aria-hidden="true">/</span> Independent work</span>
        </nav>

        <header className="atlas-hero">
          <p className="atlas-eyebrow">Meteorology meets spatial computing</p>
          <div className="atlas-hero-grid">
            <div>
              <p className="atlas-wordmark">Doppler<span>Atlas</span></p>
              <h1>VR/3D Radar Viewer</h1>
              <p className="atlas-headline">A different perspective<br />on the storm.</p>
            </div>
            <div className="atlas-hero-copy">
              <p>I’m building a weather workspace that brings radar off the flat map and into three dimensions—on a desktop or in virtual reality.</p>
              <a className="button button-primary" href={website} target="_blank" rel="noreferrer">Visit Doppler Atlas <span aria-hidden="true">↗</span></a>
              <a className="atlas-demo-link" href={`${website}demo.html`} target="_blank" rel="noreferrer">Watch the walkthrough <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <figure className="atlas-hero-image">
            <img src={`${base}doppler-atlas/orbit.webp`} width="1280" height="598" alt="A three-dimensional radar reflectivity volume rising above a geographic map in Doppler Atlas" fetchPriority="high" />
            <figcaption><span>01 / Radar in three dimensions</span><span>Actual app capture</span></figcaption>
          </figure>
        </header>

        <dl className="atlas-facts">
          <div><dt>Project</dt><dd>Independent development</dd></div>
          <div><dt>Focus</dt><dd>Weather visualization</dd></div>
          <div><dt>Built with</dt><dd>Unity &amp; OpenXR</dd></div>
          <div><dt>Experience</dt><dd>Desktop &amp; PC VR</dd></div>
        </dl>

        <section className="atlas-intro" aria-labelledby="atlas-idea">
          <div><p className="atlas-eyebrow">The idea</p><h2 id="atlas-idea">Weather has depth.<br />The workspace should, too.</h2></div>
          <div>
            <p>Radar is more than a picture on a map. Its vertical structure adds another way to examine a storm. Doppler Atlas lets you move around the radar volume, change your perspective, and explore what is happening above the surface.</p>
            <p>This independent project brings together my meteorology background and software development: weather data, 3D rendering, and an interface designed for spatial exploration.</p>
          </div>
        </section>

        <section className="atlas-workspace" aria-labelledby="atlas-workspace-title">
          <div className="atlas-section-heading"><div><p className="atlas-eyebrow">Inside the viewer</p><h2 id="atlas-workspace-title">One storm. Room to explore.</h2></div><span className="atlas-image-note">Screenshots from Doppler Atlas</span></div>
          <figure className="atlas-wide-capture">
            <a href={`${base}doppler-atlas/spatial.webp`} target="_blank" rel="noreferrer" aria-label="Open the full Doppler Atlas workspace screenshot">
              <img src={`${base}doppler-atlas/spatial.webp`} width="1600" height="1000" alt="Doppler Atlas spatial workspace with a central 3D storm, radar map, vertical section, sounding, and movable controls" loading="lazy" />
            </a>
            <figcaption><span>02 / A spatial weather workspace</span><span>Open image ↗</span></figcaption>
          </figure>
          <div className="atlas-capabilities">
            <article><span className="atlas-number">01</span><h3>Move around the data</h3><p>Rotate the radar volume and bring its structure into view from different angles.</p></article>
            <article><span className="atlas-number">02</span><h3>Slice &amp; probe</h3><p>Look through the storm with vertical sections and inspect echoes with probing tools.</p></article>
            <article><span className="atlas-number">03</span><h3>Arrange the workspace</h3><p>Keep maps, atmospheric profiles, and controls alongside the 3D view in movable panels.</p></article>
          </div>
        </section>

        <section className="atlas-detail" aria-labelledby="atlas-context">
          <figure>
            <a href={`${base}doppler-atlas/radar.webp`} target="_blank" rel="noreferrer" aria-label="Open the full Doppler Atlas radar panel screenshot"><img src={`${base}doppler-atlas/radar.webp`} width="1600" height="1000" alt="A floating 2D radar panel with reflectivity colors, location labels, and a height control" loading="lazy" /></a>
            <figcaption>03 / The familiar radar map, alongside the volume</figcaption>
          </figure>
          <div className="atlas-detail-copy"><p className="atlas-eyebrow">A connected view</p><h2 id="atlas-context">Keep the map.<br />Add another dimension.</h2><p>The 3D view sits alongside familiar weather displays. A radar map provides geographic context while the volume and vertical sections offer other perspectives on the same storm.</p><p>These captures show the app’s historical May 20, 2013 Moore storm demonstration. They illustrate the interface and data views, rather than current weather conditions.</p></div>
        </section>

        <section className="atlas-cta" aria-labelledby="atlas-more">
          <div><p className="atlas-eyebrow">Explore the project</p><h2 id="atlas-more">See Doppler Atlas in motion.</h2><p>Watch the walkthrough and find the latest project and availability details.</p></div>
          <a className="button button-primary" href={`${website}demo.html`} target="_blank" rel="noreferrer">Watch the demo <span aria-hidden="true">↗</span></a>
        </section>
        <CaseStudyFooter base={base} next={{ label: 'Browse all work', href: workIndexUrl() }} />
      </div>
    </main>
  )
}
