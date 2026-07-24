import { useState } from 'react'
import type {
  HrrrVariable,
  PrimaryWeatherLayer,
  RadarProduct,
  SatelliteProduct,
  StationOverlay,
} from '../../lib/severe-weather/mapTypes'
import {
  CAPE,
  DEWPOINT_F,
  IR_TEMPC,
  MS_TO_KT,
  REFLECTIVITY,
  TEMPERATURE_F,
  VELOCITY_MS,
  WIND_MPH,
  type ColorStop,
  domainOf,
  gradientCss,
} from '../../lib/severe-weather/colormaps'

// Start minimized on small screens so the legend doesn't cover the map.
function initiallyCollapsed(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
}

interface DynamicLegendProps {
  primaryLayer: PrimaryWeatherLayer
  radarProduct: RadarProduct
  satelliteProduct: SatelliteProduct
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
  { color: '#9ca3af', label: 'No estimate' },
]

// Matches the report symbology in mapLayers.ts, including the fallback colour.
const REPORT_SYMBOLS: { color: string; label: string }[] = [
  { color: '#2f5fd0', label: 'Measured wind' },
  { color: '#f97316', label: 'Wind damage' },
  { color: '#dc2626', label: 'Tornado' },
  { color: '#16a34a', label: 'Hail' },
  { color: '#7c3aed', label: 'Other' },
]

const HRRR_LEGENDS: Record<
  HrrrVariable,
  { label: string; stops: ColorStop[]; unit: string }
> = {
  composite_reflectivity: { label: 'Composite reflectivity', stops: REFLECTIVITY, unit: 'dBZ' },
  wind_gust: { label: 'Surface wind gust', stops: WIND_MPH, unit: 'mph' },
  wind_speed_10m: { label: '10 m wind speed', stops: WIND_MPH, unit: 'mph' },
  temperature_2m: { label: '2 m temperature', stops: TEMPERATURE_F, unit: '°F' },
  dewpoint_2m: { label: '2 m dew point', stops: DEWPOINT_F, unit: '°F' },
  mucape: { label: 'MUCAPE', stops: CAPE, unit: 'J/kg' },
}

const SATELLITE_LABELS: Record<SatelliteProduct, string> = {
  visible: 'Band 2 visible (0.64 µm reflectance)',
  infrared: 'Band 13 infrared (10.3 µm brightness temp)',
  sandwich: 'Sandwich (visible detail over infrared)',
}

const STATION_RAMPS: Record<
  Exclude<StationOverlay, 'none'>,
  { stops: ColorStop[]; label: string; unit: string }
> = {
  temperature: {
    label: 'Temperature',
    unit: '°F',
    stops: [
      [60, '#2563eb'],
      [70, '#16a34a'],
      [80, '#f59e0b'],
      [90, '#dc2626'],
    ],
  },
  dewpoint: {
    label: 'Dew point',
    unit: '°F',
    stops: [
      [40, '#dbeafe'],
      [55, '#60a5fa'],
      [65, '#16a34a'],
      [75, '#166534'],
    ],
  },
  wind: {
    label: 'Sustained wind',
    unit: 'mph',
    stops: [
      [0, '#e5e7eb'],
      [20, '#f59e0b'],
      [40, '#f97316'],
      [60, '#dc2626'],
      [80, '#7c3aed'],
    ],
  },
  gust: {
    label: 'Wind gust',
    unit: 'mph',
    stops: [
      [0, '#e5e7eb'],
      [20, '#f59e0b'],
      [40, '#f97316'],
      [60, '#dc2626'],
      [80, '#7c3aed'],
    ],
  },
}

function RampItem({
  label,
  stops,
  unit,
  minLabel,
  maxLabel,
  note,
}: {
  label: string
  stops: ColorStop[]
  unit: string
  minLabel?: string
  maxLabel?: string
  note?: string
}) {
  const [min, max] = domainOf(stops)
  return (
    <div className="swx-legend__item">
      <span className="swx-legend__label">
        {label} <span className="swx-legend__unit">({unit})</span>
      </span>
      <span className="swx-legend__bar" style={{ background: gradientCss(stops) }} />
      <span className="swx-legend__scale">
        <span>{minLabel ?? min}</span>
        <span>{maxLabel ?? `${max}+`}</span>
      </span>
      {note && <span className="swx-legend__note">{note}</span>}
    </div>
  )
}

export function DynamicLegend({
  primaryLayer,
  radarProduct,
  satelliteProduct,
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

  const velocityKt = Math.round(domainOf(VELOCITY_MS)[1] * MS_TO_KT)

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
        <RampItem label="Observed reflectivity" stops={REFLECTIVITY} unit="dBZ" />
      )}

      {primaryLayer === 'radar' && radarProduct === 'velocity' && (
        <RampItem
          label="Observed base velocity — KDMX"
          stops={VELOCITY_MS}
          unit="m/s"
          minLabel="−40 toward"
          maxLabel="+40 away"
          note={`Radar-relative, single site · ±${velocityKt} kt`}
        />
      )}

      {primaryLayer === 'hrrr' && (
        <RampItem
          label={`HRRR forecast ${hrrrLegend.label.toLowerCase()}`}
          stops={hrrrLegend.stops}
          unit={hrrrLegend.unit}
          note="Model forecast, not an observation"
        />
      )}

      {primaryLayer === 'satellite' && satelliteProduct === 'infrared' && (
        <RampItem
          label="GOES-16 infrared"
          stops={IR_TEMPC}
          unit="°C"
          minLabel="−90 (cold tops)"
          maxLabel="+20 (warm)"
          note={SATELLITE_LABELS.infrared}
        />
      )}

      {primaryLayer === 'satellite' && satelliteProduct !== 'infrared' && (
        <div className="swx-legend__item">
          <span className="swx-legend__label">GOES-16 ABI</span>
          <span className="swx-legend__scale">
            <span>{SATELLITE_LABELS[satelliteProduct]}</span>
          </span>
          {satelliteProduct === 'sandwich' && (
            <span className="swx-legend__note">
              Infrared colours as above, brightness from visible
            </span>
          )}
        </div>
      )}

      {stationOverlay !== 'none' && (
        <RampItem
          label={`Station ${STATION_RAMPS[stationOverlay].label.toLowerCase()}`}
          stops={STATION_RAMPS[stationOverlay].stops}
          unit={STATION_RAMPS[stationOverlay].unit}
        />
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
          <span className="swx-legend__note">Thick outline = report received late</span>
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
          <span className="swx-legend__note">Surveyed after the event, not a live observation</span>
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
