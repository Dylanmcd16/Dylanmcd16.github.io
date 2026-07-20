import { lazy, Suspense, type CSSProperties } from 'react'

export type HeroSceneVariant = 'plrb' | 'corteva'

// Code-split: d3-contour ships only in this chunk, loaded on the Corteva page,
// never in the homepage bundle. PLRB's scene below is pure CSS, so it stays
// synchronous.
const CortevaContourScene = lazy(() => import('./CortevaContourScene'))

/**
 * Decorative background for the professional case-study hero.
 *
 * PLRB uses the bundled GPM IMERG precipitation texture (the same layer the
 * landing-page globe overlays). Corteva uses a procedurally generated
 * d3-contour agronomic-analysis scene.
 */
export function CaseStudyHeroScene({ variant }: { variant: HeroSceneVariant }) {
  return (
    <div
      className={`case-hero-scene case-hero-scene--${variant}`}
      aria-hidden="true"
    >
      {variant === 'plrb' ? (
        <PlrbPrecipScene />
      ) : (
        <Suspense fallback={null}>
          <CortevaContourScene />
        </Suspense>
      )}
    </div>
  )
}

/**
 * PLRB precipitation background.
 *
 * Renders the bundled GPM IMERG precipitation texture — the same layer the
 * landing-page globe overlays — recolored through a CSS luminance mask.
 * Deliberately static and local: no NASA GIBS request, so it paints
 * immediately and never shifts after the visitor has started reading. Live
 * data stays on the homepage globe, where "current weather" carries the idea.
 */
function PlrbPrecipScene() {
  const base = import.meta.env.BASE_URL
  const sceneStyle = {
    '--plrb-precip-texture': `url("${base}globe/precip.png")`,
  } as CSSProperties

  return (
    <div className="plrb-precip-scene" style={sceneStyle}>
      <div className="plrb-precip-atmosphere" />
      <div className="plrb-precip-field" />
      <div className="plrb-precip-data-grid" />
      <div className="plrb-precip-veil" />
    </div>
  )
}
