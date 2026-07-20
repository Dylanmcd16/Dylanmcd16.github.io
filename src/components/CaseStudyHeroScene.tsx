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

const RADAR_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

/**
 * Decorative hero background for the professional case studies.
 *
 * aria-hidden because it carries no information a reader needs - the title,
 * summary, and tags do that.
 */
export function CaseStudyHeroScene({ variant }: { variant: HeroSceneVariant }) {
  return (
    <div className={`case-hero-scene case-hero-scene--${variant}`} aria-hidden="true">
      {variant === 'plrb' ? <PlrbRadarScene /> : <CortevaFieldScene />}
    </div>
  )
}

/**
 * PLRB: a stylized weather-analysis display - range rings over a regional
 * map, with drifting echoes, a storm track, and report points. Deliberately
 * abstract rather than a literal radar product.
 */
function PlrbRadarScene() {
  const radarCenterX = 720
  const radarCenterY = 300
  const spokeLength = 270

  return (
    <svg
      className="case-scene-svg"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <defs>
        <filter id="plrb-cell-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="11" />
        </filter>

        <radialGradient id="plrb-cell-gradient">
          <stop offset="0%" stopColor="#4e78d6" stopOpacity="0.32" />
          <stop offset="48%" stopColor="#7899dc" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#aec0e4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Geographic grid behind the display. */}
      <g className="plrb-map-grid">
        <line x1="395" y1="80" x2="395" y2="540" />
        <line x1="500" y1="50" x2="500" y2="555" />
        <line x1="610" y1="35" x2="610" y2="565" />
        <line x1="720" y1="25" x2="720" y2="575" />
        <line x1="830" y1="35" x2="830" y2="565" />
        <line x1="940" y1="70" x2="940" y2="535" />

        <line x1="350" y1="115" x2="990" y2="115" />
        <line x1="335" y1="205" x2="995" y2="205" />
        <line x1="325" y1="300" x2="1000" y2="300" />
        <line x1="335" y1="395" x2="995" y2="395" />
        <line x1="355" y1="485" x2="985" y2="485" />
      </g>

      {/* Stylized regional boundaries - suggestive, not a precise map. */}
      <g className="plrb-map-boundaries">
        <path d="M385 145 C470 126 550 138 625 120 C710 100 796 115 905 95" />
        <path d="M370 235 C460 220 548 238 640 214 C750 185 835 210 955 183" />
        <path d="M360 330 C445 314 525 340 615 314 C720 284 824 308 970 278" />
        <path d="M375 430 C465 405 565 432 665 408 C770 384 865 398 952 380" />

        <path d="M455 95 C440 170 458 245 438 325 C425 385 438 452 420 515" />
        <path d="M565 68 C550 155 576 220 555 304 C538 375 556 450 540 535" />
        <path d="M680 55 C664 132 690 210 672 290 C655 370 682 458 666 548" />
        <path d="M795 70 C780 145 805 225 786 305 C770 385 800 460 785 535" />
        <path d="M900 100 C885 170 910 235 895 310 C880 385 905 445 892 510" />
      </g>

      {/* Static range rings and spokes: the analysis frame. */}
      <g className="plrb-radar-rings">
        <circle cx={radarCenterX} cy={radarCenterY} r="88" />
        <circle cx={radarCenterX} cy={radarCenterY} r="166" />
        <circle cx={radarCenterX} cy={radarCenterY} r="246" />
      </g>

      <g className="plrb-radar-spokes">
        {RADAR_ANGLES.map((angle) => {
          const radians = (angle * Math.PI) / 180

          return (
            <line
              key={angle}
              x1={radarCenterX}
              y1={radarCenterY}
              x2={radarCenterX + Math.cos(radians) * spokeLength}
              y2={radarCenterY + Math.sin(radians) * spokeLength}
            />
          )
        })}
      </g>

      {/* Soft echoes, each drifting on its own slow cycle. */}
      <g className="plrb-storm-cell plrb-storm-cell--one" filter="url(#plrb-cell-blur)">
        <ellipse cx="610" cy="205" rx="100" ry="48" fill="url(#plrb-cell-gradient)" />
        <ellipse cx="650" cy="230" rx="74" ry="43" fill="url(#plrb-cell-gradient)" />
      </g>

      <g className="plrb-storm-cell plrb-storm-cell--two" filter="url(#plrb-cell-blur)">
        <ellipse cx="790" cy="365" rx="115" ry="52" fill="url(#plrb-cell-gradient)" />
        <ellipse cx="845" cy="340" rx="78" ry="39" fill="url(#plrb-cell-gradient)" />
      </g>

      <g className="plrb-storm-cell plrb-storm-cell--three" filter="url(#plrb-cell-blur)">
        <ellipse cx="905" cy="170" rx="84" ry="42" fill="url(#plrb-cell-gradient)" />
      </g>

      {/* Storm path: the line is fixed, only its dash pattern flows. */}
      <path
        className="plrb-storm-track"
        d="M455 430 C540 395 585 340 655 310 C725 278 800 230 908 180"
      />

      <g className="plrb-report-points">
        <circle cx="515" cy="399" r="5" />
        <circle cx="575" cy="350" r="4" />
        <circle cx="642" cy="314" r="5" />
        <circle cx="710" cy="280" r="4" />
        <circle cx="790" cy="235" r="5" />
        <circle cx="870" cy="197" r="4" />
      </g>

      <g className="plrb-radar-site">
        <circle cx={radarCenterX} cy={radarCenterY} r="7" />
        <circle cx={radarCenterX} cy={radarCenterY} r="16" />
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
