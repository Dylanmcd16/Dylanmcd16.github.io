import { lazy, Suspense } from 'react'

export type HeroSceneVariant = 'plrb' | 'corteva'

// Code-split so the Corteva-only scene stays out of the homepage bundle.
// PLRB's scene below is small and dependency-free, so it stays synchronous.
const CortevaContourScene = lazy(() => import('./CortevaContourScene'))

/**
 * Decorative background for the professional case-study hero.
 *
 * Both scenes follow one grammar: filled data bleeds off the right edge of
 * the page, dissolves into stroke-only outlines, and is gone before the
 * text. No panels, cards, or full diagrams behind the copy.
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

/* ------------------------------------------------------------------------- */
/* PLRB: crisp precipitation-analysis cells                                  */
/* ------------------------------------------------------------------------- */

/** Deterministic PRNG so the cells are identical on every render. */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** Closed Catmull-Rom spline through the points, as cubic beziers. */
function closedSpline(points: Array<[number, number]>): string {
  const n = points.length
  const at = (i: number) => points[((i % n) + n) % n]
  let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = at(i - 1)
    const [x1, y1] = at(i)
    const [x2, y2] = at(i + 1)
    const [x3, y3] = at(i + 2)
    d += ` C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  return `${d}Z`
}

/**
 * Nested contour bands for one precipitation cell. Every band reuses the same
 * angular jitter, scaled down and nudged toward the upper-right, so the bands
 * nest without intersecting — the stepped-intensity look of a gridded
 * rain-rate product (IMERG), with crisp vector edges instead of a blurred
 * raster.
 */
function cellBands(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  count: number,
): string[] {
  const random = seededRandom(seed)
  const samples = 14
  const jitter = Array.from({ length: samples }, () => 0.87 + random() * 0.26)
  const scales = [1, 0.66, 0.4, 0.2]

  return scales.slice(0, count).map((scale, band) => {
    const dx = band * 0.07 * rx
    const dy = -band * 0.045 * ry
    const points = jitter.map((j, i) => {
      const angle = (i / samples) * Math.PI * 2
      return [
        cx + dx + Math.cos(angle) * rx * scale * j,
        cy + dy + Math.sin(angle) * ry * scale * j,
      ] as [number, number]
    })
    return closedSpline(points)
  })
}

// Light blue -> blue -> green -> muted amber. IMERG's banding, softened; the
// amber core appears in one cell only and there is no red.
const BAND_COLORS = ['#93b6e6', '#5f95da', '#4fae7f', '#e2c25c']
const BAND_OPACITY = [0.26, 0.3, 0.34, 0.48]

// Filled cells hug and bleed off the right edge of the 760-wide viewBox.
const PRECIP_CELLS = [
  { cx: 632, cy: 252, rx: 148, ry: 102, seed: 11, bands: 4 },
  { cx: 706, cy: 98, rx: 112, ry: 66, seed: 29, bands: 2 },
  { cx: 596, cy: 452, rx: 122, ry: 74, seed: 47, bands: 3 },
]

// Stroke-only isolines on the text side: the data dissolving.
const PRECIP_OUTLINES = [
  { cx: 436, cy: 190, rx: 92, ry: 56, seed: 61, rings: 2 },
  { cx: 388, cy: 396, rx: 66, ry: 42, seed: 79, rings: 1 },
]

function PlrbPrecipScene() {
  return (
    <svg
      className="case-scene-svg"
      viewBox="0 0 760 560"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      {/* Faint graticule for map context. */}
      <g stroke="#6d8ac1" strokeOpacity="0.07" strokeWidth="1">
        <line x1="470" y1="24" x2="470" y2="536" />
        <line x1="580" y1="24" x2="580" y2="536" />
        <line x1="690" y1="24" x2="690" y2="536" />
        <line x1="340" y1="150" x2="760" y2="150" />
        <line x1="340" y1="300" x2="760" y2="300" />
        <line x1="340" y1="450" x2="760" y2="450" />
      </g>

      {/* Survey tick marks. */}
      <g stroke="#5c7fb9" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" fill="none">
        <path d="M500 110 V126 M492 118 H508" />
        <path d="M652 504 V520 M644 512 H660" />
      </g>

      {/* Dissolving isolines toward the text. */}
      <g fill="none" stroke="#7fa3d8">
        {PRECIP_OUTLINES.map((cell) =>
          cellBands(cell.cx, cell.cy, cell.rx, cell.ry, cell.seed, cell.rings).map(
            (d, ring) => (
              <path
                key={`${cell.seed}-${ring}`}
                d={d}
                strokeOpacity={ring === 0 ? 0.3 : 0.2}
                strokeWidth="1.3"
                strokeDasharray={ring === 0 ? undefined : '3 6'}
              />
            ),
          ),
        )}
      </g>

      {/* Filled precipitation cells with a barely-there drift. */}
      <g className="plrb-cells">
        {PRECIP_CELLS.map((cell) =>
          cellBands(cell.cx, cell.cy, cell.rx, cell.ry, cell.seed, cell.bands).map(
            (d, band) => (
              <path
                key={`${cell.seed}-${band}`}
                d={d}
                fill={BAND_COLORS[band]}
                fillOpacity={BAND_OPACITY[band]}
              />
            ),
          ),
        )}
      </g>

      {/* A storm-motion hint: dashed track with small report points. */}
      <path
        d="M480 352 C540 322 600 292 668 262"
        fill="none"
        stroke="#4d79c9"
        strokeOpacity="0.2"
        strokeWidth="1.4"
        strokeDasharray="2 6"
      />
      <g fill="#3f6ec4" fillOpacity="0.4">
        <circle cx="520" cy="325" r="3.4" />
        <circle cx="566" cy="296" r="2.8" />
        <circle cx="612" cy="268" r="3.4" />
      </g>
    </svg>
  )
}
