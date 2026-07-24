import type { DataDrivenPropertyValueSpecification } from 'maplibre-gl'
import type { Map } from 'maplibre-gl'
import type { StationOverlay } from './mapTypes'

const FIELD_BY_OVERLAY = {
  temperature: 'temperature_f',
  dewpoint: 'dewpoint_f',
  wind: 'wind_speed_mph',
  gust: 'wind_gust_mph',
} as const

const LABEL_BY_OVERLAY = {
  temperature: 'temp_label',
  dewpoint: 'dewpoint_label',
  wind: 'wind_label',
  gust: 'gust_label',
} as const

type ColorExpression = DataDrivenPropertyValueSpecification<string>

function colorRamp(field: string, overlay: Exclude<StationOverlay, 'none'>): ColorExpression {
  if (overlay === 'temperature') {
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', field], 70],
      60,
      '#2563eb',
      70,
      '#16a34a',
      80,
      '#f59e0b',
      90,
      '#dc2626',
    ] as ColorExpression
  }

  if (overlay === 'dewpoint') {
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', field], 55],
      40,
      '#dbeafe',
      55,
      '#60a5fa',
      65,
      '#16a34a',
      75,
      '#166534',
    ] as ColorExpression
  }

  // wind and gust share a speed ramp.
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', field], 0],
    0,
    '#e5e7eb',
    20,
    '#f59e0b',
    40,
    '#f97316',
    60,
    '#dc2626',
    80,
    '#7c3aed',
  ] as ColorExpression
}

export function applyStationOverlay(map: Map, overlay: StationOverlay): void {
  if (overlay === 'none') {
    return
  }

  const field = FIELD_BY_OVERLAY[overlay]
  const label = LABEL_BY_OVERLAY[overlay]

  map.setLayoutProperty('station-labels', 'text-field', ['get', label])
  map.setPaintProperty('station-points', 'circle-color', colorRamp(field, overlay))
}
