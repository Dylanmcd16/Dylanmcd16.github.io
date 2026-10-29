import { CaseStudyFooter } from './CaseStudyFooter'
import { workIndexUrl } from '../utils/routes'
import './DopplerAtlasPage.css'

export function DopplerAtlasPage({ base }: { base: string }) {
  return (
    <main className="atlas-page">
      <div className="atlas-container">
        <nav className="atlas-nav" aria-label="Project navigation">
          <a href={base}>← Back to portfolio</a>
        </nav>

        <header className="atlas-hero">
          <h1>Doppler Atlas: VR/3D Radar Viewer</h1>
          <p className="atlas-summary">I am developing a weather visualization application in Unity and OpenXR that displays radar reflectivity as a three-dimensional volume, with desktop and PC VR interfaces for exploring storms.</p>
          <div className="atlas-links">
            <a className="text-link" href="https://doppleratlas.app/" target="_blank" rel="noreferrer">Doppler Atlas website ↗</a>
            <a className="text-link" href="https://doppleratlas.app/demo.html" target="_blank" rel="noreferrer">Video walkthrough ↗</a>
          </div>
        </header>

        <section className="atlas-section" aria-labelledby="atlas-implementation">
          <h2 id="atlas-implementation">Technical approach</h2>
          <div className="atlas-copy">
            <p>The application combines meteorological data and a geographic map with a 3D radar volume. Users can rotate and move around the storm, inspect echoes with a probe, and examine vertical sections through the volume.</p>
            <p>I build the visualization and spatial workspace in Unity, using OpenXR for VR interaction. Movable panels place the radar map, vertical section, atmospheric profile, and controls alongside the volume so the data can be examined together.</p>
          </div>
        </section>

        <figure className="atlas-figure">
          <a href={`${base}doppler-atlas/spatial.webp`} target="_blank" rel="noreferrer" aria-label="Open full-size Doppler Atlas workspace screenshot">
            <img src={`${base}doppler-atlas/spatial.webp`} width="1600" height="1000" alt="Doppler Atlas workspace with a 3D radar volume, vertical section, atmospheric profile, radar map, and controls" />
          </a>
          <figcaption>Spatial workspace showing the radar volume and supporting data panels. Select the image to enlarge.</figcaption>
        </figure>

        <section className="atlas-section" aria-labelledby="atlas-radar">
          <h2 id="atlas-radar">Radar and geographic context</h2>
          <div className="atlas-copy">
            <p>The 2D radar panel provides a geographic reference alongside the 3D volume. The panel shown below includes a height control and a reflectivity color scale; vertical sections and probe controls provide additional ways to inspect the displayed data.</p>
            <p>The screenshots show the historical May 20, 2013 Moore storm demonstration, not current weather.</p>
          </div>
        </section>
        <figure className="atlas-figure atlas-radar-figure">
          <a href={`${base}doppler-atlas/radar.webp`} target="_blank" rel="noreferrer" aria-label="Open full-size radar panel screenshot">
            <img src={`${base}doppler-atlas/radar.webp`} width="1600" height="1000" alt="2D radar panel with reflectivity scale, geographic labels, and height control" loading="lazy" />
          </a>
          <figcaption>Radar reflectivity panel from the historical storm workspace.</figcaption>
        </figure>

        <section className="atlas-section" aria-labelledby="atlas-tools">
          <h2 id="atlas-tools">Tools and methods</h2>
          <div className="atlas-copy"><p>Unity · C# · OpenXR · 3D radar visualization · Spatial interfaces · Meteorological data</p></div>
        </section>
        <CaseStudyFooter base={base} next={{ label: 'Browse all work', href: workIndexUrl() }} />
      </div>
    </main>
  )
}
