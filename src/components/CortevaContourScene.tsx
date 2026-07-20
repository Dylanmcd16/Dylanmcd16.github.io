import { useId } from 'react'

/**
 * Corteva case-study hero background.
 *
 * A cluster of experimental plots emerging from the right edge of the page.
 * The rightmost column is filled and bleeds off-screen; moving toward the
 * text the plots lighten, lose their fill, and finally decay to dashed ghost
 * outlines — data dissolving before it reaches the writing. One GPS track
 * threads through with a few measurement points.
 *
 * Deliberately not a card: no drop shadow, no backing panel, no complete
 * grid, and no motion. All values are illustrative — no Corteva data.
 */

const PLOT_W = 80
const PLOT_H = 46
const ROW_STEP = 58
const ROW_START = 84

const FILLS = ['#d8d0a0', '#c4cf9d', '#a3c493', '#7fb08d', '#619e85']

type PlotSpec = {
  id: string
  path: string
  mode: 'fill' | 'outline' | 'ghost'
  fill?: string
  fillOpacity?: number
}

/** Slightly irregular quad so plots read as surveyed, not spreadsheet cells. */
function plotPath(x: number, y: number, index: number): string {
  const topInset = index % 3 === 0 ? 3 : 1
  const lowerShift = index % 4 === 0 ? 4 : 2
  return [
    `M ${x + topInset} ${y + 2}`,
    `L ${x + PLOT_W - 2} ${y}`,
    `L ${x + PLOT_W + lowerShift} ${y + PLOT_H - 3}`,
    `L ${x} ${y + PLOT_H + 2}`,
    'Z',
  ].join(' ')
}

// Columns dissolve right-to-left: full fills -> light fills -> outlines ->
// dashed ghosts. Skipped rows keep the silhouette ragged instead of blocky.
const COLUMNS: Array<{
  x: number
  yOffset: number
  rows: number[]
  mode: (row: number, position: number) => PlotSpec['mode']
  fillOpacity: number
}> = [
  { x: 398, yOffset: 30, rows: [1, 2, 3], mode: () => 'ghost', fillOpacity: 0 },
  {
    x: 488,
    yOffset: 18,
    rows: [0, 2, 3, 4],
    mode: (_row, position) => (position === 0 || position === 3 ? 'outline' : 'fill'),
    fillOpacity: 0.32,
  },
  { x: 578, yOffset: 8, rows: [0, 1, 2, 3, 4], mode: () => 'fill', fillOpacity: 0.5 },
  { x: 668, yOffset: 0, rows: [0, 1, 2, 3, 4], mode: () => 'fill', fillOpacity: 0.68 },
]

const PLOTS: PlotSpec[] = COLUMNS.flatMap((column, columnIndex) =>
  column.rows.map((row, position) => {
    const x = column.x
    const y = ROW_START + row * ROW_STEP + column.yOffset
    const mode = column.mode(row, position)
    return {
      id: `plot-${columnIndex}-${row}`,
      path: plotPath(x, y, row + columnIndex * 2),
      mode,
      fill: mode === 'fill' ? FILLS[(row + columnIndex * 2) % 5] : undefined,
      fillOpacity: mode === 'fill' ? column.fillOpacity : undefined,
    }
  }),
)

const CROP_TEXTURE_PLOTS = PLOTS.filter(
  (plot) => plot.mode === 'fill' && (plot.fillOpacity ?? 0) >= 0.5,
)

const PRIMARY_TRACK =
  'M 640 52 C 632 120 650 165 641 225 S 628 330 640 390 S 650 440 644 492'
const SECONDARY_TRACK =
  'M 706 70 C 700 140 712 200 705 265 S 698 380 706 440'

const POINTS = [
  { x: 638, y: 130 },
  { x: 641, y: 225, important: true },
  { x: 634, y: 320 },
  { x: 641, y: 405, important: true },
  { x: 644, y: 480 },
  { x: 705, y: 180 },
  { x: 703, y: 340 },
]

export default function CortevaContourScene() {
  const uid = useId().replace(/:/g, '')
  const cropId = `${uid}-crop`
  const clipId = `${uid}-clip`

  return (
    <svg
      className="case-scene-svg"
      viewBox="0 0 760 560"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <defs>
        <pattern
          id={cropId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(5)"
        >
          <line x1="1.5" y1="0" x2="1.5" y2="8" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="0.9" />
        </pattern>
        <clipPath id={clipId}>
          {CROP_TEXTURE_PLOTS.map((plot) => (
            <path key={plot.id} d={plot.path} />
          ))}
        </clipPath>
      </defs>

      {/* Faint interpolation curves for geospatial context. */}
      <g fill="none" stroke="#3a7d8d" strokeOpacity="0.12" strokeWidth="1" strokeLinecap="round">
        <path d="M370 505 C460 478 560 492 706 462" />
        <path d="M420 40 C500 22 580 34 660 20" />
      </g>

      {/* Survey tick marks — same grammar as the PLRB graticule crosses. */}
      <g stroke="#5c7fb9" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" fill="none">
        <path d="M452 58 V74 M444 66 H460" />
        <path d="M500 462 V478 M492 470 H508" />
      </g>

      {/* The plot cluster, tilted just off-axis. */}
      <g transform="rotate(-3 560 280)">
        {PLOTS.map((plot) => {
          if (plot.mode === 'ghost') {
            return (
              <path
                key={plot.id}
                d={plot.path}
                fill="none"
                stroke="#8fa8b8"
                strokeOpacity="0.32"
                strokeWidth="1.1"
                strokeDasharray="4 5"
              />
            )
          }
          if (plot.mode === 'outline') {
            return (
              <path
                key={plot.id}
                d={plot.path}
                fill="none"
                stroke="#93aab6"
                strokeOpacity="0.45"
                strokeWidth="1.1"
              />
            )
          }
          return (
            <path
              key={plot.id}
              d={plot.path}
              fill={plot.fill}
              fillOpacity={plot.fillOpacity}
              stroke="#ffffff"
              strokeOpacity="0.72"
              strokeWidth="1.1"
            />
          )
        })}

        {/* Crop-row texture only where fills are strongest. */}
        <rect
          x="560"
          y="60"
          width="200"
          height="440"
          fill={`url(#${cropId})`}
          clipPath={`url(#${clipId})`}
        />

        {/* GPS collection tracks: colored underlay + white dashes. */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={PRIMARY_TRACK} stroke="#2d6b8a" strokeOpacity="0.14" strokeWidth="3.2" />
          <path
            d={PRIMARY_TRACK}
            stroke="#ffffff"
            strokeOpacity="0.85"
            strokeWidth="1.8"
            pathLength={100}
            strokeDasharray="0.7 2.3"
          />
          <path d={SECONDARY_TRACK} stroke="#2d6b8a" strokeOpacity="0.1" strokeWidth="2.6" />
          <path
            d={SECONDARY_TRACK}
            stroke="#ffffff"
            strokeOpacity="0.6"
            strokeWidth="1.5"
            pathLength={100}
            strokeDasharray="0.7 2.3"
          />
        </g>

        {/* Measurement points. */}
        <g>
          {POINTS.map((point) => (
            <g key={`${point.x}-${point.y}`} transform={`translate(${point.x} ${point.y})`}>
              {point.important && (
                <circle
                  r="9"
                  fill="rgba(66, 143, 210, 0.08)"
                  stroke="rgba(66, 143, 210, 0.26)"
                  strokeWidth="1"
                />
              )}
              <circle
                r={point.important ? 5.6 : 4.4}
                fill="rgba(255, 255, 255, 0.75)"
                stroke="rgba(75, 143, 208, 0.65)"
                strokeWidth="1.2"
              />
              <circle
                r={point.important ? 2.5 : 2}
                fill="#438fd1"
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="0.8"
              />
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}
