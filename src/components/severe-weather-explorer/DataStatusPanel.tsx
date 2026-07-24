import type {
  HrrrVariable,
  PrimaryWeatherLayer,
  RadarProduct,
  StationOverlay,
  TimelineFrame,
} from '../../lib/severe-weather/mapTypes'

interface DataStatusPanelProps {
  frame: TimelineFrame
  primaryLayer: PrimaryWeatherLayer
  radarProduct: RadarProduct
  stationOverlay: StationOverlay
  hrrrVariable: HrrrVariable
}

function formatUtc(value: string | null | undefined): string {
  if (!value) {
    return 'unavailable'
  }
  return value.replace('T', ' ').replace('Z', 'Z')
}

// Persistent, honest data-time readout. Each source shows its own valid/scan
// time; differently-timed datasets are never described as simultaneous.
export function DataStatusPanel({
  frame,
  primaryLayer,
  radarProduct,
  stationOverlay,
  hrrrVariable,
}: DataStatusPanelProps) {
  const rows: { label: string; value: string; missing?: boolean }[] = [
    { label: 'Map timeline', value: `${frame.displayTimeCentral} · ${formatUtc(frame.validTimeUtc)}` },
  ]

  const showingVelocity = primaryLayer === 'radar' && radarProduct === 'velocity'
  if (showingVelocity) {
    const velocityAvailable = Boolean(frame.radar?.products?.velocity)
    rows.push({
      label: 'KDMX velocity scan',
      value: velocityAvailable
        ? formatUtc(frame.radar?.velocitySourceTimeUtc ?? frame.radar?.sourceTimeUtc)
        : 'no scan at this time',
      missing: !velocityAvailable,
    })
  } else {
    const radarAvailable = Boolean(frame.radar?.available)
    rows.push({
      label: 'Radar scan',
      value: radarAvailable
        ? formatUtc(frame.radar?.sourceTimeUtc ?? frame.radar?.validTimeUtc)
        : 'no scan at this time',
      missing: !radarAvailable,
    })
  }

  if (primaryLayer === 'satellite' || primaryLayer === 'radar') {
    const satAvailable = Boolean(frame.satellite?.available)
    rows.push({
      label: 'Satellite scan',
      value: satAvailable ? formatUtc(frame.satellite?.sourceTimeUtc) : 'not in this demo',
      missing: !satAvailable,
    })
  }

  if (primaryLayer === 'hrrr') {
    const hrrr = frame.hrrr
    if (hrrr) {
      rows.push({ label: 'HRRR cycle', value: formatUtc(hrrr.cycleTimeUtc) })
      rows.push({ label: 'Forecast hour', value: `F${String(hrrr.forecastHour).padStart(2, '0')}` })
      rows.push({ label: 'HRRR variable', value: hrrrVariable.replace(/_/g, ' ') })
    } else {
      rows.push({ label: 'HRRR', value: 'not in this demo', missing: true })
    }
  }

  if (stationOverlay !== 'none') {
    rows.push({ label: 'Station obs', value: 'nearest within ±7 min of frame' })
  }

  return (
    <div className="swx-status">
      <h3 className="swx-status__title">Data times</h3>
      <dl className="swx-status__grid">
        {rows.map((row) => (
          <div key={row.label} className={`swx-status__row ${row.missing ? 'is-missing' : ''}`}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
