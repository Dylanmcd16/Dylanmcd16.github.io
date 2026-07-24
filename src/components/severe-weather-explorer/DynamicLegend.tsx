import { useState } from 'react'
import type {
  HrrrVariable,
  PrimaryWeatherLayer,
  RadarProduct,
  StationOverlay,
} from '../../lib/severe-weather/mapTypes'

// Start minimized on small screens so the legend doesn't cover the map.
function initiallyCollapsed(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
}

interface DynamicLegendProps {
  primaryLayer: PrimaryWeatherLayer
  radarProduct: RadarProduct
  hrrrVariable: HrrrVariable
  stationOverlay: StationOverlay
  showReports: boolean
  showWarnings: boolean
  showAssessments: boolean
}

// Matches the damage severity ramp in mapLayers.ts.
const DAMAGE_WIND_CLASSES: { color: string; label: string }[] = [
  { color: '#facc15', label: '< 70 mph' },
  { color: '#f97316', label: '70–89 mph' },
  { color: '#dc2626', label: '90–109 mph' },
  { color: '#7e22ce', label: '110+ mph' },
]

// Matches the pipeline's diverging velocity colormap (velocity.py).
const VELOCITY_STOPS = ['#00ff00', '#00af00', '#19501e', '#878787', '#5f1919', '#c80000', '#ff5a5a']

const REFLECTIVITY_STOPS = ['#04e9e7', '#019ff4', '#02fd02', '#fdf802', '#fd9500', '#fd0000', '#f800fd']

const HRRR_LEGENDS: Record<HrrrVariable, { label: string; stops: string[]; scale: string }> = {
  composite_reflectivity: {
    label: 'HRRR reflectivity (dBZ)',
    stops: REFLECTIVITY_STOPS,
    scale: '5 → 75+',
  },
  wind_gust: {
    label: 'HRRR surface gust (mph)',
    stops: ['#e6e6eb', '#fad25a', '#f58228', '#dc2828', '#961e78'],
    scale: '0 → 110',
  },
  wind_speed_10m: {
    label: 'HRRR 10 m wind (mph)',
    stops: ['#e6e6eb', '#fad25a', '#f58228', '#dc2828', '#961e78'],
    scale: '0 → 110',
  },
  temperature_2m: {
    label: 'HRRR 2 m temp (°F)',
    stops: ['#3b528b', '#21918c', '#5ec962', '#fde725', '#f08228', '#c81e1e'],
    scale: '45 → 100',
  },
  dewpoint_2m: {
    label: 'HRRR 2 m dew point (°F)',
    stops: ['#d7cdb4', '#96be78', '#46a06e', '#1e785a', '#0f3c50'],
    scale: '30 → 80',
  },
  mucape: {
    label: 'HRRR MUCAPE (J/kg)',
    stops: ['#ebf5ff', '#78c8fa', '#5ac878', '#fadc46', '#f58228', '#d22828'],
    scale: '250 → 5000',
  },
}

const REPORT_SYMBOLS: { color: string; label: string }[] = [
  { color: '#2f5fd0', label: 'Measured wind' },
  { color: '#f97316', label: 'Wind damage' },
  { color: '#dc2626', label: 'Tornado' },
  { color: '#16a34a', label: 'Hail' },
]

const STATION_RAMPS: Record<Exclude<StationOverlay, 'none'>, { stops: string[]; label: string }> = {
  temperature: { stops: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626'], label: '60° → 90°F' },
  dewpoint: { stops: ['#dbeafe', '#60a5fa', '#16a34a', '#166534'], label: '40° → 75°F' },
  wind: { stops: ['#e5e7eb', '#f59e0b', '#f97316', '#dc2626', '#7c3aed'], label: '0 → 80 mph' },
  gust: { stops: ['#e5e7eb', '#f59e0b', '#f97316', '#dc2626', '#7c3aed'], label: '0 → 80 mph' },
}

function gradient(stops: string[]): string {
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

export function DynamicLegend({
  primaryLayer,
  radarProduct,
  hrrrVariable,
  stationOverlay,
  showReports,
  showWarnings,
  showAssessments,
}: DynamicLegendProps) {
  const hrrrLegend = HRRR_LEGENDS[hrrrVariable]
  const [collapsed, setCollapsed] = useState(initiallyCollapsed)

  if (collapsed) {
    return (
      <button
        type="button"
        className="swx-legend swx-legend--collapsed"
        aria-expanded={false}
        onClick={() => setCollapsed(false)}
      >
        Legend +
      </button>
    )
  }

  return (
    <div className="swx-legend">
      <button
        type="button"
        className="swx-legend__toggle"
        aria-expanded={true}
        onClick={() => setCollapsed(true)}
      >
        Legend −
      </button>
      {primaryLayer === 'radar' && radarProduct === 'reflectivity' && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">Reflectivity (dBZ)</span>
          <span className="swx-legend__bar" style={{ background: gradient(REFLECTIVITY_STOPS) }} />
          <span className="swx-legend__scale">
            <span>5</span>
            <span>75+</span>
          </span>
        </div>
      )}

      {primaryLayer === 'radar' && radarProduct === 'velocity' && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">Base velocity (m/s) — KDMX</span>
          <span className="swx-legend__bar" style={{ background: gradient(VELOCITY_STOPS) }} />
          <span className="swx-legend__scale">
            <span>−40 toward</span>
            <span>+40 away</span>
          </span>
        </div>
      )}

      {primaryLayer === 'hrrr' && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">{hrrrLegend.label}</span>
          <span className="swx-legend__bar" style={{ background: gradient(hrrrLegend.stops) }} />
          <span className="swx-legend__scale">
            <span>{hrrrLegend.scale}</span>
          </span>
        </div>
      )}

      {primaryLayer === 'satellite' && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">GOES-16 ABI</span>
          <span className="swx-legend__scale">
            <span>Cold cloud tops highlighted</span>
          </span>
        </div>
      )}

      {stationOverlay !== 'none' && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">
            {stationOverlay === 'temperature' && 'Temperature'}
            {stationOverlay === 'dewpoint' && 'Dew point'}
            {stationOverlay === 'wind' && 'Sustained wind'}
            {stationOverlay === 'gust' && 'Wind gust'}
          </span>
          <span
            className="swx-legend__bar"
            style={{ background: gradient(STATION_RAMPS[stationOverlay].stops) }}
          />
          <span className="swx-legend__scale">
            <span>{STATION_RAMPS[stationOverlay].label}</span>
          </span>
        </div>
      )}

      {showReports && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">Storm reports</span>
          <ul className="swx-legend__symbols">
            {REPORT_SYMBOLS.map((symbol) => (
              <li key={symbol.label}>
                <span className="swx-legend__dot" style={{ background: symbol.color }} />
                {symbol.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAssessments && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">Damage survey (est. wind)</span>
          <ul className="swx-legend__symbols">
            {DAMAGE_WIND_CLASSES.map((cls) => (
              <li key={cls.label}>
                <span className="swx-legend__dot" style={{ background: cls.color }} />
                {cls.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showWarnings && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">Warnings</span>
          <ul className="swx-legend__symbols">
            <li>
              <span className="swx-legend__swatch" style={{ borderColor: '#f59e0b' }} />
              Severe Thunderstorm
            </li>
            <li>
              <span className="swx-legend__swatch" style={{ borderColor: '#ef4444' }} />
              Tornado
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
