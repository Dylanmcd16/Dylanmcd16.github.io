import { useId, type CSSProperties } from 'react'
import { contours, type ContourMultiPolygon } from 'd3-contour'

/**
 * Corteva case-study hero background.
 *
 * A procedurally generated agronomic-analysis scene: d3-contour turns a
 * synthetic value field into smooth analysis contours, and hand-placed SVG
 * supplies the experimental plots, crop-row texture, GPS collection tracks,
 * and measurement points. Everything is illustrative — no Corteva data.
 *
 * Static by design: no scanning band and no traveling marker. The only motion
 * is a very slow plot "breathe" and a slow pulse on a few measurement points.
 *
 * Code-split (default export, lazy-loaded) so d3-contour ships only in this
 * chunk, never in the homepage bundle.
 */

const SVG_WIDTH = 900
const SVG_HEIGHT = 620

// Low-resolution grid; d3-contour interpolates and smooths it into polygons.
const CONTOUR_COLUMNS = 24
const CONTOUR_ROWS = 18
const CONTOUR_THRESHOLDS = [0.28, 0.4, 0.52, 0.64, 0.76, 0.86]

type Coordinate = readonly [number, number]

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

/** Deterministic pseudo-noise so the layout is identical on every load. */
function seededNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function gaussian(
  x: number,
  y: number,
  cx: number,
  cy: number,
  spread: number,
  amplitude: number,
): number {
  const dx = x - cx
  const dy = y - cy
  return amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread))
}

/** Synthetic surface (canopy vigor / moisture-like) feeding the contours. */
function buildContourValues(): number[] {
  const values: number[] = []
  for (let row = 0; row < CONTOUR_ROWS; row += 1) {
    for (let column = 0; column < CONTOUR_COLUMNS; column += 1) {
      const primary = gaussian(column, row, 18.5, 6.5, 5.6, 0.62)
      const secondary = gaussian(column, row, 15.5, 14.5, 4.4, 0.42)
      const cool = gaussian(column, row, 9.5, 8.5, 5.2, -0.22)
      const gradient = (column / Math.max(1, CONTOUR_COLUMNS - 1)) * 0.26
      const wave =
        Math.sin(column * 0.58 + row * 0.17) * 0.035 +
        Math.cos(row * 0.63 - column * 0.12) * 0.025
      const noise = (seededNoise(row * CONTOUR_COLUMNS + column + 17) - 0.5) * 0.045
      values.push(clamp(0.16 + primary + secondary + cool + gradient + wave + noise))
    }
  }
  return values
}

/**
 * Serialize a d3-contour MultiPolygon to SVG path data. This replaces
 * d3-geo's geoPath(geoIdentity()) — the projection is the identity, so each
 * ring is just moveto + linetos + close in grid coordinates.
 */
function contourToPath(geometry: ContourMultiPolygon): string {
  let d = ''
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) {
      ring.forEach((point, index) => {
        d += `${index === 0 ? 'M' : 'L'}${point[0].toFixed(2)} ${point[1].toFixed(2)}`
      })
      d += 'Z'
    }
  }
  return d
}

const CONTOUR_PATHS = contours()
  .size([CONTOUR_COLUMNS, CONTOUR_ROWS])
  .smooth(true)
  .thresholds(CONTOUR_THRESHOLDS)(buildContourValues())
  .map((geometry) => ({ value: geometry.value, path: contourToPath(geometry) }))

// Grid units -> viewBox units (24*38≈912 wide, 18*35=630 tall).
const CONTOUR_TRANSFORM = 'translate(8 2) scale(38 35)'

/* ---------------------------------------------------------- Field plots -- */

const FIELD_COLUMNS = 4
const FIELD_ROWS = 5
const FIELD_START_X = 318
const FIELD_START_Y = 78
const BASE_PLOT_WIDTH = 112
const BASE_PLOT_HEIGHT = 82
const PLOT_H_GAP = 15
const PLOT_V_GAP = 14

type FieldPlot = {
  id: string
  points: string
  fill: string
}

/** Muted gold (low) -> lime -> green/teal (high). */
function plotFill(value: number): string {
  const hue = 42 + value * 108
  const saturation = 48 + value * 13
  const lightness = 77 - value * 25
  return `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`
}

function buildFieldPlots(): FieldPlot[] {
  const plots: FieldPlot[] = []
  for (let row = 0; row < FIELD_ROWS; row += 1) {
    for (let column = 0; column < FIELD_COLUMNS; column += 1) {
      const seed = row * FIELD_COLUMNS + column + 1
      const x = FIELD_START_X + column * (BASE_PLOT_WIDTH + PLOT_H_GAP) + row * 4
      const y = FIELD_START_Y + row * (BASE_PLOT_HEIGHT + PLOT_V_GAP) - column * 1.5
      const width = BASE_PLOT_WIDTH + (seededNoise(seed * 3.1) - 0.5) * 8
      const height = BASE_PLOT_HEIGHT + (seededNoise(seed * 5.7) - 0.5) * 7

      // Small deterministic corner offsets so plots read as surveyed
      // boundaries rather than a spreadsheet of perfect rectangles.
      const corners: Coordinate[] = [
        [x + 3 + (seededNoise(seed * 7.3) - 0.5) * 5, y + 3],
        [x + width - 2, y + (seededNoise(seed * 9.1) - 0.5) * 5],
        [x + width + (seededNoise(seed * 11.7) - 0.5) * 5, y + height - 3],
        [x + (seededNoise(seed * 13.9) - 0.5) * 5, y + height + 2],
      ]

      const value = clamp(
        0.24 +
          column * 0.11 +
          Math.sin(row * 0.9 + column * 0.55) * 0.14 +
          (seededNoise(seed * 22.1) - 0.5) * 0.2,
      )

      plots.push({
        id: `plot-${row}-${column}`,
        points: corners.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' '),
        fill: plotFill(value),
      })
    }
  }
  return plots
}

const FIELD_PLOTS = buildFieldPlots()

/* ------------------------------------------------ Tracks & measurements -- */

const TRACKS = [
  {
    id: 'primary',
    path: 'M397 55 C392 106 408 127 401 166 S389 229 401 267 S414 335 404 365 S389 442 403 489 S420 541 411 570',
  },
  {
    id: 'secondary',
    secondary: true,
    path: 'M653 62 C645 106 665 138 655 182 S643 241 657 282 S671 343 661 384 S646 446 661 492 S673 534 667 568',
  },
]

const MEASUREMENTS: Array<{ x: number; y: number; emphasized?: boolean }> = [
  { x: 397, y: 103 },
  { x: 401, y: 166, emphasized: true },
  { x: 397, y: 224 },
  { x: 402, y: 282 },
  { x: 405, y: 348, emphasized: true },
  { x: 400, y: 412 },
  { x: 405, y: 479 },
  { x: 411, y: 548, emphasized: true },
  { x: 654, y: 110 },
  { x: 656, y: 180 },
  { x: 653, y: 247, emphasized: true },
  { x: 659, y: 316 },
  { x: 660, y: 381 },
  { x: 658, y: 447, emphasized: true },
  { x: 664, y: 515 },
]

export default function CortevaContourScene() {
  // Unique ids so the pattern/clip refs never collide with another SVG.
  const uid = useId().replace(/:/g, '')
  const cropId = `${uid}-crop`
  const clipId = `${uid}-clip`
  const glowId = `${uid}-glow`

  return (
    <svg
      className="case-scene-svg corteva-contour-svg"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <defs>
        <radialGradient id={glowId} cx="67%" cy="43%" r="67%">
          <stop offset="0%" stopColor="rgba(82, 190, 141, 0.25)" />
          <stop offset="46%" stopColor="rgba(89, 174, 204, 0.13)" />
          <stop offset="76%" stopColor="rgba(239, 197, 91, 0.08)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>

        {/* Crop-row texture, clipped to the plot polygons. */}
        <pattern id={cropId} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(7)">
          <line x1="1" y1="0" x2="1" y2="9" stroke="rgba(255, 255, 255, 0.42)" strokeWidth="1.15" />
          <line x1="5.5" y1="0" x2="5.5" y2="9" stroke="rgba(9, 74, 57, 0.11)" strokeWidth="0.65" />
        </pattern>

        <clipPath id={clipId}>
          {FIELD_PLOTS.map((plot) => (
            <polygon key={plot.id} points={plot.points} />
          ))}
        </clipPath>
      </defs>

      {/* Soft atmospheric glow. */}
      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill={`url(#${glowId})`} />

      {/* Procedurally generated analysis contours. */}
      <g className="corteva-contours" transform={CONTOUR_TRANSFORM}>
        {CONTOUR_PATHS.map((contour, index) => {
          const t = index / Math.max(1, CONTOUR_PATHS.length - 1)
          return (
            <g key={`${contour.value}-${index}`}>
              <path d={contour.path} fill={`hsl(${198 - t * 80} 58% ${84 - t * 12}%)`} fillOpacity={0.045 + t * 0.025} />
              <path
                d={contour.path}
                fill="none"
                stroke="rgba(49, 125, 151, 0.34)"
                strokeWidth="0.034"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
      </g>

      {/* Small coordinate accents. */}
      <g className="corteva-map-accents">
        <path d="M737 42 V70 M723 56 H751" />
        <path d="M848 126 V154 M834 140 H862" />
        <path d="M703 76 H858" />
        <path d="M828 47 V189" />
      </g>

      {/* Field, tracks, and points share one oblique rotation. */}
      <g className="corteva-field" transform="rotate(-6 586 320)">
        <g className="corteva-plots">
          {FIELD_PLOTS.map((plot, index) => (
            <polygon
              key={plot.id}
              className="corteva-plot"
              points={plot.points}
              fill={plot.fill}
              stroke="rgba(255, 255, 255, 0.88)"
              strokeWidth="2.3"
              vectorEffect="non-scaling-stroke"
              style={{ '--plot-delay': `${-index * 0.19}s` } as CSSProperties}
            />
          ))}
        </g>

        {/* Crop-row texture, confined to the plots. */}
        <rect x="278" y="46" width="595" height="545" fill={`url(#${cropId})`} opacity="0.6" clipPath={`url(#${clipId})`} />

        {/* GPS / Smartstick collection tracks (static). */}
        <g className="corteva-tracks">
          {TRACKS.map((track) => (
            <path
              key={track.id}
              className={track.secondary ? 'corteva-track corteva-track--secondary' : 'corteva-track'}
              d={track.path}
              fill="none"
              pathLength="100"
            />
          ))}
        </g>

        {/* Measurement points; emphasized ones pulse slowly. */}
        <g className="corteva-points">
          {MEASUREMENTS.map((point, index) => (
            <g
              key={`${point.x}-${point.y}`}
              transform={`translate(${point.x} ${point.y})`}
              style={{ '--pulse-delay': `${-index * 0.36}s` } as CSSProperties}
            >
              {point.emphasized && <circle className="corteva-point-pulse" r="13" />}
              <circle className="corteva-point-ring" r={point.emphasized ? 8 : 6} />
              <circle className="corteva-point-core" r={point.emphasized ? 3.6 : 2.8} />
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}
