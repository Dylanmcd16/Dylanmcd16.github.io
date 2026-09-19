import type { NdviSeries, SeasonData } from '../../types/soybean-season'
import {
  formatInches,
  longDate,
  shortDate,
  type FieldRainfall,
} from '../../lib/soybean-season/season'
import { requestZoomToField } from './SeasonMap'

const CHART_WIDTH = 300
const PAD_LEFT = 24
const PAD_RIGHT = 6
const PAD_TOP = 10
const PAD_BOTTOM = 17

interface AxisPoint {
  x: number
  y: number
}

function makeScales(nDays: number, height: number, yMax: number) {
  const innerWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT
  const innerHeight = height - PAD_TOP - PAD_BOTTOM
  return {
    x: (day: number) => PAD_LEFT + (day / (nDays - 1)) * innerWidth,
    y: (value: number) => PAD_TOP + innerHeight - (value / yMax) * innerHeight,
    innerWidth,
    innerHeight,
  }
}

function Axes({
  height,
  nDays,
  yMax,
  yTicks,
  format,
  startLabel,
  endLabel,
}: {
  height: number
  nDays: number
  yMax: number
  yTicks: number[]
  format: (value: number) => string
  startLabel: string
  endLabel: string
}) {
  const scale = makeScales(nDays, height, yMax)
  return (
    <g>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD_LEFT}
            x2={CHART_WIDTH - PAD_RIGHT}
            y1={scale.y(tick)}
            y2={scale.y(tick)}
            className="sse-chart__grid"
          />
          <text x={PAD_LEFT - 5} y={scale.y(tick) + 3} className="sse-chart__tick" textAnchor="end">
            {format(tick)}
          </text>
        </g>
      ))}
      <text x={PAD_LEFT} y={height - 3} className="sse-chart__tick">
        {startLabel}
      </text>
      <text x={CHART_WIDTH - PAD_RIGHT} y={height - 3} className="sse-chart__tick" textAnchor="end">
        {endLabel}
      </text>
    </g>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
    </svg>
  )
}

interface FieldPanelProps {
  data: SeasonData
  rainfall: Map<number, FieldRainfall>
  selectedFieldId: number
  /** Calendar day index of the acquisition being shown. */
  day: number
  onDismiss: () => void
}

/** The detail card for one field.
 *
 * It only exists while a field is selected, so it arrives carrying content
 * rather than sitting empty waiting to be filled.
 */
export function FieldPanel({ data, rainfall, selectedFieldId, day, onDismiss }: FieldPanelProps) {
  const feature = data.fields.features.find((f) => f.properties.id === selectedFieldId)
  if (!feature) {
    return null
  }

  const { manifest } = data
  const properties = feature.properties
  const series: NdviSeries | undefined = data.ndvi[String(properties.id)]
  const nDays = manifest.days.length
  const dateIso = manifest.days[day]

  const rain = rainfall.get(properties.id)
  const cumulative = rain?.cumulative
  const trailing = rain?.trailing14
  const daily = rain?.daily

  const ndviToday = series ? series.v[series.d.indexOf(day)] ?? undefined : undefined

  // ---- NDVI chart: one dot per date this field was actually measured on.
  // A missing date is cloud over this field, not a gap in the season.
  const ndviScale = makeScales(nDays, 120, 1)
  const ndviPoints: AxisPoint[] = []
  if (series) {
    series.d.forEach((d, i) => {
      const value = series.v[i]
      if (value !== null && value !== undefined) {
        ndviPoints.push({ x: ndviScale.x(d), y: ndviScale.y(value) })
      }
    })
  }
  const ndviPath = ndviPoints
    .map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')

  const dailyMax = daily ? Math.max(0.5, ...Array.from(daily)) : 1
  const dailyScale = makeScales(nDays, 92, dailyMax)
  const cumulativeMax = cumulative ? Math.max(1, cumulative[nDays - 1]) : 1
  const cumulativeScale = makeScales(nDays, 96, cumulativeMax)
  const cumulativePath = cumulative
    ? Array.from(cumulative)
        .map(
          (value, d) =>
            `${d === 0 ? 'M' : 'L'}${cumulativeScale.x(d).toFixed(1)} ${cumulativeScale
              .y(value)
              .toFixed(1)}`,
        )
        .join(' ')
    : ''

  const startLabel = shortDate(manifest.days[0])
  const endLabel = shortDate(manifest.days[nDays - 1])

  return (
    <aside className="sse-card sse-glass" aria-label={`Field ${properties.id} detail`}>
      <div className="sse-card__head">
        <h3 className="sse-card__title">Field {properties.id}</h3>
        <button
          type="button"
          className="sse-card__dismiss"
          onClick={onDismiss}
          aria-label="Close the field detail"
        >
          <CloseIcon />
        </button>
      </div>

      <p className="sse-card__meta">
        {properties.acres ? `${properties.acres.toLocaleString()} acres` : '—'}
        {properties.ha ? ` · ${properties.ha} ha` : ''}
        {` · measured on ${properties.n} of ${manifest.nPasses} dates`}
      </p>
      {properties.soil ? <p className="sse-card__soil">{properties.soil}</p> : null}

      <button type="button" className="sse-zoom" onClick={() => requestZoomToField(properties.id)}>
        Zoom to field
      </button>

      <dl className="sse-readout">
        <div>
          <dt>NDVI</dt>
          <dd className="sse-readout__canopy">
            {ndviToday === undefined ? '—' : ndviToday.toFixed(3)}
          </dd>
          <span>{ndviToday === undefined ? 'clouded out' : longDate(dateIso)}</span>
        </div>
        <div>
          <dt>On this date</dt>
          <dd className="sse-readout__rain">{daily ? formatInches(daily[day], 2) : '—'}</dd>
          <span>{shortDate(dateIso)}, local day</span>
        </div>
        <div>
          <dt>Last 14 d</dt>
          <dd className="sse-readout__rain">{trailing ? formatInches(trailing[day]) : '—'}</dd>
          <span>to {shortDate(dateIso)}</span>
        </div>
        <div>
          <dt>Since 1 May</dt>
          <dd className="sse-readout__rain">{cumulative ? formatInches(cumulative[day]) : '—'}</dd>
          <span>to {shortDate(dateIso)}</span>
        </div>
      </dl>

      <p className="sse-chart__label">NDVI through the season</p>
      <svg
        className="sse-chart"
        viewBox={`0 0 ${CHART_WIDTH} 120`}
        role="img"
        aria-label={`NDVI for field ${properties.id}, measured on ${properties.n} dates`}
      >
        <Axes
          height={120}
          nDays={nDays}
          yMax={1}
          yTicks={[0, 0.5, 1]}
          format={(value) => value.toFixed(1)}
          startLabel={startLabel}
          endLabel={endLabel}
        />
        <path d={ndviPath} className="sse-chart__ndvi-line" />
        {ndviPoints.map((point) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={1.8}
            className="sse-chart__ndvi-dot"
          />
        ))}
        <line
          x1={ndviScale.x(day)}
          x2={ndviScale.x(day)}
          y1={PAD_TOP}
          y2={120 - PAD_BOTTOM}
          className="sse-chart__cursor"
        />
      </svg>
      <p className="sse-chart__note">
        One point per date this field could be measured. Gaps are cloud, not a change in the crop.
      </p>

      <p className="sse-chart__label">Daily rainfall</p>
      <svg
        className="sse-chart"
        viewBox={`0 0 ${CHART_WIDTH} 92`}
        role="img"
        aria-label={`Daily MRMS rainfall over field ${properties.id}`}
      >
        <Axes
          height={92}
          nDays={nDays}
          yMax={dailyMax}
          yTicks={[0, dailyMax / 2, dailyMax]}
          format={(value) => value.toFixed(1)}
          startLabel={startLabel}
          endLabel={endLabel}
        />
        {daily
          ? Array.from(daily).map((value, d) =>
              value > 0.005 ? (
                <line
                  key={d}
                  x1={dailyScale.x(d)}
                  x2={dailyScale.x(d)}
                  y1={dailyScale.y(0)}
                  y2={dailyScale.y(value)}
                  className="sse-chart__rain-bar"
                />
              ) : null,
            )
          : null}
        <line
          x1={dailyScale.x(day)}
          x2={dailyScale.x(day)}
          y1={PAD_TOP}
          y2={92 - PAD_BOTTOM}
          className="sse-chart__cursor"
        />
      </svg>

      <p className="sse-chart__label">Rainfall since 1 May</p>
      <svg
        className="sse-chart"
        viewBox={`0 0 ${CHART_WIDTH} 96`}
        role="img"
        aria-label={`Cumulative MRMS rainfall over field ${properties.id}`}
      >
        <Axes
          height={96}
          nDays={nDays}
          yMax={cumulativeMax}
          yTicks={[0, cumulativeMax / 2, cumulativeMax]}
          format={(value) => value.toFixed(0)}
          startLabel={startLabel}
          endLabel={endLabel}
        />
        <path
          d={`${cumulativePath} L${cumulativeScale.x(nDays - 1).toFixed(1)} ${cumulativeScale
            .y(0)
            .toFixed(1)} L${cumulativeScale.x(0).toFixed(1)} ${cumulativeScale.y(0).toFixed(1)} Z`}
          className="sse-chart__rain-area"
        />
        <path d={cumulativePath} className="sse-chart__rain-line" />
        <line
          x1={cumulativeScale.x(day)}
          x2={cumulativeScale.x(day)}
          y1={PAD_TOP}
          y2={96 - PAD_BOTTOM}
          className="sse-chart__cursor"
        />
      </svg>
      <p className="sse-chart__note">
        All three charts share one x-axis, so greenness and rainfall read together. Rainfall is the{' '}
        <strong>MRMS radar/multi-sensor precipitation estimate</strong>, averaged over the ~1 km
        cells this field covers and shown in inches. It is an estimate, not a gauge in the field,
        and at 1 km most fields cover only a few cells.
      </p>
    </aside>
  )
}
