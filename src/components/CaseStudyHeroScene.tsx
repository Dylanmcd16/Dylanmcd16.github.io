import { useEffect, useState, type CSSProperties } from 'react'
import {
  buildPrecipGetMapUrl,
  fetchLatestGibsWeatherLayers,
} from './weatherLayers'

export type HeroSceneVariant = 'plrb' | 'corteva'

/**
 * Experimental plots used in the Corteva background.
 *
 * The SVG uses its own virtual 1000 x 600 coordinate system, so these values
 * are scene units rather than browser pixels.
 */
const FIELD_PLOTS = Array.from({ length: 30 }, (_, index) => {
  const columns = 6
  const column = index % columns
  const row = Math.floor(index / columns)

  return {
    index,
    x: 20 + column * 84,
    y: 20 + row * 82,
    width: 70,
    height: 68,
    active: [4, 9, 16, 22, 27].includes(index),
  }
})

/**
 * Observation points along the serpentine collection route. Synthetic and
 * decorative - these are not Corteva data.
 */
const GPS_POINTS = [
  [55, 370], [55, 310], [55, 250], [55, 185], [55, 120],
  [138, 105], [138, 170], [138, 235], [138, 300], [138, 365],
  [222, 365], [222, 300], [222, 235], [222, 170], [222, 105],
  [306, 105], [306, 170], [306, 235], [306, 300], [306, 365],
  [390, 365], [390, 300], [390, 235], [390, 170], [390, 105],
  [474, 105], [474, 170], [474, 235], [474, 300], [474, 365],
] as const

/**
 * Decorative background for the professional case-study hero.
 *
 * The PLRB version uses the same NASA GIBS / GPM IMERG precipitation data
 * source as the landing-page globe. The Corteva version remains the existing
 * synthetic field-plot visualization.
 */
export function CaseStudyHeroScene({ variant }: { variant: HeroSceneVariant }) {
  return (
    <div
      className={`case-hero-scene case-hero-scene--${variant}`}
      aria-hidden="true"
    >
      {variant === 'plrb' ? <PlrbPrecipScene /> : <CortevaFieldScene />}
    </div>
  )
}

/**
 * PLRB precipitation background.
 *
 * A local copy of the globe precipitation texture provides an immediate
 * fallback. The component then resolves the latest available NASA GIBS IMERG
 * timestamp and requests a transparent WMS image. When that live image loads,
 * it fades over the fallback.
 */
function PlrbPrecipScene() {
  const base = import.meta.env.BASE_URL
  const [liveImageUrl, setLiveImageUrl] = useState('')
  const [liveImageReady, setLiveImageReady] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    fetchLatestGibsWeatherLayers(controller.signal)
      .then((layers) => {
        if (cancelled || !layers.precip) return

        setLiveImageUrl(
          buildPrecipGetMapUrl(layers.precip, {
            width: 2048,
            height: 920,
            bbox: {
              west: -180,
              south: -55,
              east: 180,
              north: 78,
            },
          }),
        )
      })
      .catch(() => {
        // Keep the bundled precipitation texture if NASA GIBS is unavailable.
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  const sceneStyle = {
    '--plrb-precip-texture': `url("${base}globe/precip.png")`,
  } as CSSProperties

  return (
    <div
      className={`plrb-precip-scene ${
        liveImageReady ? 'has-live-data' : ''
      }`}
      style={sceneStyle}
    >
      <div className="plrb-precip-atmosphere" />
      <div className="plrb-precip-fallback" />

      {liveImageUrl && (
        <img
          className={`plrb-precip-live ${
            liveImageReady ? 'is-ready' : ''
          }`}
          src={liveImageUrl}
          alt=""
          onLoad={() => setLiveImageReady(true)}
          onError={() => {
            setLiveImageReady(false)
            setLiveImageUrl('')
          }}
        />
      )}

      <div className="plrb-precip-data-grid" />
      <div className="plrb-precip-veil" />
    </div>
  )
}

/**
 * Corteva: an oblique grid of experimental plots with a serpentine collection
 * route, observation points, and plots that take a brief analytical fill.
 *
 * Everything sits in one transformed group so the plots, route, and points
 * stay spatially aligned when the field tilts.
 */
function CortevaFieldScene() {
  return (
    <svg
      className="case-scene-svg"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <defs>
        <filter id="corteva-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* translate right, rotate slightly, skew for the oblique map angle. */}
      <g
        className="corteva-field-plane"
        transform="translate(420 58) rotate(-6 270 220) skewX(-12)"
      >
        <rect className="corteva-field-base" x="0" y="0" width="530" height="435" rx="14" />

        {FIELD_PLOTS.map((plot) => (
          <rect
            key={plot.index}
            className={`corteva-plot ${plot.active ? 'corteva-plot--active' : ''}`}
            x={plot.x}
            y={plot.y}
            width={plot.width}
            height={plot.height}
            rx="3"
            style={{ animationDelay: `${(plot.index % 6) * 0.65}s` }}
          />
        ))}

        <g className="corteva-crop-rows">
          {Array.from({ length: 22 }, (_, index) => (
            <line key={index} x1="16" y1={16 + index * 19} x2="514" y2={16 + index * 19} />
          ))}
        </g>

        {/* Repeated passes through the plot rows. */}
        <path
          className="corteva-gps-route"
          d="
            M55 380
            L55 100
            L138 100
            L138 380
            L222 380
            L222 100
            L306 100
            L306 380
            L390 380
            L390 100
            L474 100
            L474 380
          "
        />

        <g className="corteva-gps-points">
          {GPS_POINTS.map(([x, y], index) => (
            <circle
              key={`${x}-${y}`}
              className="corteva-gps-point"
              cx={x}
              cy={y}
              r="4.5"
              style={{ animationDelay: `${index * 0.18}s` }}
            />
          ))}
        </g>

        <g className="corteva-sensor-marker">
          <circle
            className="corteva-sensor-glow"
            cx="306"
            cy="232"
            r="18"
            filter="url(#corteva-soft-glow)"
          />
          <circle className="corteva-sensor-core" cx="306" cy="232" r="6" />
        </g>
      </g>
    </svg>
  )
}