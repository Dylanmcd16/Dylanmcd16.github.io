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

/** Deterministic PRNG so the generated field is identical on every render. */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/**
 * Closed Catmull-Rom spline through the given points, emitted as cubic
 * beziers. Gives the contour bands smooth, organic edges instead of polygons.
 */
function closedSpline(points: Array<[number, number]>) {
  const count = points.length
  const at = (index: number) => points[((index % count) + count) % count]

  let path = `M${at(0)[0].toFixed(2)} ${at(0)[1].toFixed(2)}`

  for (let i = 0; i < count; i += 1) {
    const [x0, y0] = at(i - 1)
    const [x1, y1] = at(i)
    const [x2, y2] = at(i + 1)
    const [x3, y3] = at(i + 2)

    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6

    path += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }

  return `${path}Z`
}

/**
 * One irregular contour ring. Reusing the same seed across shrinking radii
 * produces the nested cores seen in a gridded precipitation product.
 */
function contourPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  wobble = 0.34,
  samples = 16,
) {
  const random = seededRandom(seed)
  const points = Array.from({ length: samples }, (_, index) => {
    const angle = (index / samples) * Math.PI * 2
    const jitter = 1 - wobble / 2 + random() * wobble
    return [
      cx + Math.cos(angle) * rx * jitter,
      cy + Math.sin(angle) * ry * jitter,
    ] as [number, number]
  })

  return closedSpline(points)
}

/**
 * Precipitation systems, elongated and grouped into three bands the way rain
 * rate organizes on the globe overlay. Each renders as nested intensity
 * levels; inner levels are nudged off-center so the nesting is not concentric.
 */
const PRECIP_SYSTEMS = [
  { cx: 430, cy: 150, rx: 95, ry: 36, seed: 1207, delay: 0 },
  { cx: 622, cy: 122, rx: 118, ry: 41, seed: 3391, delay: 2.6 },
  { cx: 812, cy: 158, rx: 88, ry: 33, seed: 5813, delay: 5.1 },
  { cx: 958, cy: 118, rx: 104, ry: 38, seed: 7717, delay: 1.4 },
  { cx: 486, cy: 312, rx: 108, ry: 40, seed: 9241, delay: 3.8 },
  { cx: 716, cy: 296, rx: 128, ry: 45, seed: 2663, delay: 6.3 },
  { cx: 934, cy: 330, rx: 92, ry: 35, seed: 4177, delay: 0.9 },
  { cx: 412, cy: 466, rx: 86, ry: 32, seed: 6529, delay: 4.7 },
  { cx: 640, cy: 486, rx: 122, ry: 43, seed: 8093, delay: 7.2 },
  { cx: 878, cy: 452, rx: 99, ry: 37, seed: 1483, delay: 2.1 },
]

/** Outermost to innermost: radius scale, drift offset, and band class index. */
const PRECIP_LEVELS = [
  { scale: 1, dx: 0, dy: 0 },
  { scale: 0.72, dx: 6, dy: -3 },
  { scale: 0.46, dx: 12, dy: -5 },
  { scale: 0.24, dx: 17, dy: -7 },
]

/**
 * Decorative hero background for the professional case studies.
 *
 * aria-hidden because it carries no information a reader needs - the title,
 * summary, and tags do that.
 */
export function CaseStudyHeroScene({ variant }: { variant: HeroSceneVariant }) {
  return (
    <div className={`case-hero-scene case-hero-scene--${variant}`} aria-hidden="true">
      {variant === 'plrb' ? <PlrbPrecipScene /> : <CortevaFieldScene />}
    </div>
  )
}

/**
 * PLRB: a gridded precipitation field over a faint graticule - nested
 * intensity contours in the visual language of the IMERG rain-rate layer the
 * homepage globe overlays, rather than a radar display.
 */
function PlrbPrecipScene() {
  const broadBands = [
    { cx: 700, cy: 145, rx: 355, ry: 76, seed: 2017 },
    { cx: 720, cy: 310, rx: 342, ry: 82, seed: 4021 },
    { cx: 680, cy: 470, rx: 320, ry: 70, seed: 6607 },
  ]

  return (
    <svg
      className="case-scene-svg"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <defs>
        {/*
         * A tiny square pattern gives the scene a faint gridded-data texture.
         * It is intentionally subtle; the contour fills remain the main visual.
         */}
        <pattern
          id="plrb-data-grid"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path d="M26 0H0V26" className="plrb-data-grid-line" />
        </pattern>

        {/*
         * Softens only the broad precipitation envelopes. The nested contour
         * levels stay crisp enough to read as gridded satellite data.
         */}
        <filter
          id="plrb-band-soften"
          x="-20%"
          y="-35%"
          width="140%"
          height="170%"
        >
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Faint latitude/longitude-style graticule behind the data field. */}
      <g className="plrb-graticule">
        {Array.from({ length: 8 }, (_, index) => (
          <line
            key={`vertical-${index}`}
            x1={350 + index * 92}
            y1="30"
            x2={350 + index * 92}
            y2="570"
          />
        ))}

        {Array.from({ length: 6 }, (_, index) => (
          <line
            key={`horizontal-${index}`}
            x1="330"
            y1={65 + index * 96}
            x2="1030"
            y2={65 + index * 96}
          />
        ))}
      </g>

      {/* A nearly invisible raster-cell texture helps imply a data product. */}
      <rect
        className="plrb-data-grid"
        x="330"
        y="24"
        width="700"
        height="552"
        fill="url(#plrb-data-grid)"
      />

      {/*
       * Large, low-opacity envelopes establish the three elongated rain-rate
       * bands before the smaller nested intensity cores are drawn on top.
       */}
      <g className="plrb-precip-envelopes" filter="url(#plrb-band-soften)">
        {broadBands.map((band, index) => (
          <path
            key={band.seed}
            className={`plrb-precip-envelope plrb-precip-envelope--${index + 1}`}
            d={contourPath(
              band.cx,
              band.cy,
              band.rx,
              band.ry,
              band.seed,
              0.24,
              22,
            )}
          />
        ))}
      </g>

      {/*
       * Each system is made from four nested contour polygons. They use the
       * same seeded shape at progressively smaller radii, then shift slightly
       * northeast so the cores feel irregular rather than perfectly centered.
       */}
      <g className="plrb-precip-field">
        {PRECIP_SYSTEMS.map((system, systemIndex) => (
          <g
            key={system.seed}
            className={`plrb-precip-system plrb-precip-system--${
              (systemIndex % 3) + 1
            }`}
            style={{ animationDelay: `${system.delay}s` }}
          >
            {PRECIP_LEVELS.map((level, levelIndex) => (
              <path
                key={`${system.seed}-${levelIndex}`}
                className={`plrb-precip-contour plrb-precip-contour--${
                  levelIndex + 1
                }`}
                d={contourPath(
                  system.cx + level.dx,
                  system.cy + level.dy,
                  system.rx * level.scale,
                  system.ry * level.scale,
                  system.seed,
                  Math.max(0.2, 0.34 - levelIndex * 0.035),
                  16,
                )}
              />
            ))}
          </g>
        ))}
      </g>

      {/*
       * Sparse sampling markers suggest that the field comes from a gridded
       * observational product, without turning the scene into a radar display.
       */}
      <g className="plrb-sample-points">
        <circle cx="462" cy="146" r="2.8" />
        <circle cx="638" cy="126" r="2.4" />
        <circle cx="786" cy="164" r="2.7" />
        <circle cx="516" cy="314" r="2.6" />
        <circle cx="738" cy="294" r="2.9" />
        <circle cx="906" cy="332" r="2.5" />
        <circle cx="438" cy="468" r="2.4" />
        <circle cx="656" cy="484" r="2.8" />
        <circle cx="860" cy="450" r="2.6" />
      </g>
    </svg>
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