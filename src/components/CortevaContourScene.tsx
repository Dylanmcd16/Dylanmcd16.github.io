import { useId } from 'react'

/**
 * Decorative hero scene for the Corteva case study.
 *
 * The graphic is intentionally small, quiet, and confined to the right side of
 * the hero. It suggests experimental plots, crop rows, spatial variation, and
 * GPS-tagged collection without competing with the title or pretending to be
 * a live application. All values and locations are illustrative.
 */

const SVG_WIDTH = 760
const SVG_HEIGHT = 520

const FIELD_COLUMNS = 4
const FIELD_ROWS = 5
const PLOT_WIDTH = 86
const PLOT_HEIGHT = 58
const COLUMN_GAP = 11
const ROW_GAP = 11
const FIELD_X = 286
const FIELD_Y = 78

const VALUES = [
  0.34, 0.58, 0.72, 0.49,
  0.43, 0.67, 0.79, 0.61,
  0.28, 0.53, 0.75, 0.69,
  0.38, 0.64, 0.83, 0.57,
  0.31, 0.48, 0.71, 0.63,
]

function plotColor(value: number): string {
  if (value < 0.38) return '#dccf83'
  if (value < 0.52) return '#b9cf82'
  if (value < 0.66) return '#82bd7c'
  if (value < 0.78) return '#57aa82'
  return '#3d927f'
}

function buildPlotPath(row: number, column: number): string {
  const index = row * FIELD_COLUMNS + column
  const rowShift = row * 3.5
  const x = FIELD_X + column * (PLOT_WIDTH + COLUMN_GAP) + rowShift
  const y = FIELD_Y + row * (PLOT_HEIGHT + ROW_GAP) - column * 1.3

  const topInset = index % 3 === 0 ? 3 : 1
  const lowerShift = index % 4 === 0 ? 4 : 2

  return [
    `M ${x + topInset} ${y + 2}`,
    `L ${x + PLOT_WIDTH - 2} ${y}`,
    `L ${x + PLOT_WIDTH + lowerShift} ${y + PLOT_HEIGHT - 3}`,
    `L ${x} ${y + PLOT_HEIGHT + 2}`,
    'Z',
  ].join(' ')
}

const PLOTS = Array.from({ length: FIELD_ROWS * FIELD_COLUMNS }, (_, index) => {
  const row = Math.floor(index / FIELD_COLUMNS)
  const column = index % FIELD_COLUMNS

  return {
    id: `plot-${row}-${column}`,
    row,
    column,
    path: buildPlotPath(row, column),
    fill: plotColor(VALUES[index]),
  }
})

const PRIMARY_TRACK = [
  'M 389 60',
  'C 383 116 399 138 390 181',
  'S 378 246 391 285',
  'S 403 347 393 385',
  'S 382 431 390 471',
].join(' ')

const SECONDARY_TRACK = [
  'M 586 67',
  'C 578 119 596 151 586 192',
  'S 574 257 588 297',
  'S 600 357 589 398',
  'S 580 438 586 466',
].join(' ')

const POINTS = [
  { x: 389, y: 111 },
  { x: 391, y: 181, important: true },
  { x: 388, y: 250 },
  { x: 393, y: 318, important: true },
  { x: 391, y: 389 },
  { x: 390, y: 455, important: true },
  { x: 586, y: 126 },
  { x: 586, y: 197 },
  { x: 587, y: 267, important: true },
  { x: 590, y: 337 },
  { x: 588, y: 409 },
]

export default function CortevaContourScene() {
  const uid = useId().replace(/:/g, '')
  const cropPatternId = `${uid}-crop-rows`
  const fieldClipId = `${uid}-field-clip`
  const glowId = `${uid}-glow`
  const fadeId = `${uid}-fade`

  return (
    <svg
      className="case-scene-svg corteva-contour-svg"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={glowId} cx="72%" cy="45%" r="62%">
          <stop offset="0%" stopColor="#8bc8aa" stopOpacity="0.2" />
          <stop offset="45%" stopColor="#91bdd4" stopOpacity="0.12" />
          <stop offset="74%" stopColor="#e4cb82" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="36%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="64%" stopColor="#ffffff" stopOpacity="0.74" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>

        <pattern
          id={cropPatternId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(5)"
        >
          <line x1="1" y1="0" x2="1" y2="8" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="0.9" />
          <line x1="5" y1="0" x2="5" y2="8" stroke="#254f45" strokeOpacity="0.08" strokeWidth="0.65" />
        </pattern>

        <clipPath id={fieldClipId}>
          {PLOTS.map((plot) => <path key={plot.id} d={plot.path} />)}
        </clipPath>

        <filter id={`${uid}-soft-shadow`} x="-20%" y="-20%" width="150%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#173d39" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill={`url(#${glowId})`} />

      <g className="corteva-topography" aria-hidden="true">
        <path d="M285 45 C365 5 438 21 503 2 S642 2 738 42" />
        <path d="M266 76 C350 32 432 50 510 25 S650 25 754 69" />
        <path d="M275 432 C352 387 441 407 511 384 S641 379 748 423" />
        <path d="M258 463 C352 415 439 440 521 415 S657 411 756 456" />
        <path d="M289 492 C376 451 456 470 535 448 S663 443 744 482" />
      </g>

      <g className="corteva-field-card" filter={`url(#${uid}-soft-shadow)`}>
        <g className="corteva-plots">
          {PLOTS.map((plot) => (
            <path
              key={plot.id}
              className="corteva-plot"
              d={plot.path}
              fill={plot.fill}
              stroke="#ffffff"
              strokeOpacity="0.82"
              strokeWidth="1.55"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <rect
          x="270"
          y="55"
          width="455"
          height="430"
          fill={`url(#${cropPatternId})`}
          clipPath={`url(#${fieldClipId})`}
          opacity="0.74"
        />

        <path className="corteva-track" d={PRIMARY_TRACK} pathLength="100" />
        <path className="corteva-track corteva-track--secondary" d={SECONDARY_TRACK} pathLength="100" />

        <g className="corteva-points">
          {POINTS.map((point) => (
            <g key={`${point.x}-${point.y}`} transform={`translate(${point.x} ${point.y})`}>
              {point.important && <circle className="corteva-point-halo" r="10.5" />}
              <circle className="corteva-point-ring" r={point.important ? 6.1 : 4.7} />
              <circle className="corteva-point-core" r={point.important ? 2.7 : 2.1} />
            </g>
          ))}
        </g>
      </g>

      <g className="corteva-grid-accent" aria-hidden="true">
        <path d="M672 53 H742" />
        <path d="M707 18 V92" />
        <circle cx="707" cy="53" r="2.2" />
      </g>

      {/* A final internal fade prevents the field from becoming a hard-edged panel. */}
      <rect x="0" y="0" width="265" height={SVG_HEIGHT} fill={`url(#${fadeId})`} opacity="0.72" />
    </svg>
  )
}
