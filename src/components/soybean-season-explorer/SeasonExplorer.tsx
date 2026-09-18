import { useEffect, useMemo, useState } from 'react'
import type { PrecipLayer, SeasonData } from '../../types/soybean-season'
import {
  buildNdviLookup,
  buildRainfallTotals,
  formatInches,
  loadSeasonData,
  shortDate,
} from '../../lib/soybean-season/season'
import { SeasonMap } from './SeasonMap'
import { LayerControls, PlaybackControls, SeasonLegend } from './SeasonControls'
import { FieldPanel } from './FieldPanel'

/** One frame per usable acquisition date. Slow enough to read the date, fast
 * enough that the whole season runs in about half a minute. */
const FRAME_MS = 620

export function SeasonExplorer() {
  const [data, setData] = useState<SeasonData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [precipLayer, setPrecipLayer] = useState<PrecipLayer>('cumulative')
  const [showFields, setShowFields] = useState(true)
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSeasonData()
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'could not load the season')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const ndvi = useMemo(() => (data ? buildNdviLookup(data) : null), [data])
  const rainfall = useMemo(() => (data ? buildRainfallTotals(data) : null), [data])

  const passes = data?.manifest.ndviDays ?? []
  const nSteps = passes.length
  const day = passes[Math.min(step, Math.max(0, nSteps - 1))] ?? 0

  // Autoplay stops at the end of the season rather than looping, so the last
  // frame stays on screen instead of snapping back to bare soil.
  useEffect(() => {
    if (!playing || nSteps === 0) {
      return
    }
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= nSteps - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, FRAME_MS)
    return () => window.clearInterval(timer)
  }, [playing, nSteps])

  if (error) {
    return (
      <div className="sse-explorer sse-explorer--message">
        <p>
          The season data could not be loaded ({error}). The explorer needs the files under{' '}
          <code>public/data/iowa-soybean-season/</code>.
        </p>
      </div>
    )
  }

  if (!data || !ndvi || !rainfall) {
    return (
      <div className="sse-explorer sse-explorer--message">
        <p>Loading 248 fields, 59 usable Sentinel-2 dates and a season of rainfall…</p>
      </div>
    )
  }

  const { manifest } = data
  const dateIso = manifest.days[day]
  const previousDay = step > 0 ? passes[step - 1] : null
  const daysSincePrevious = previousDay === null ? null : day - previousDay

  // Summary figures for this date, read straight off the data rather than
  // stored: how many fields the satellite actually measured, and how green
  // they were. A usable date is rarely a cloud-free one everywhere.
  const observed: number[] = []
  for (const feature of data.fields.features) {
    const value = ndvi.get(feature.properties.id)?.get(day)
    if (value !== undefined) {
      observed.push(value)
    }
  }
  observed.sort((a, b) => a - b)
  const medianNdvi = observed.length
    ? observed[Math.floor(observed.length / 2)]
    : null

  const cumulativeValues = Array.from(rainfall.cumulative.values()).map((series) => series[day])
  cumulativeValues.sort((a, b) => a - b)
  const medianCumulative = cumulativeValues.length
    ? cumulativeValues[Math.floor(cumulativeValues.length / 2)]
    : 0

  return (
    <div className="sse-explorer">
      <div className="sse-summary">
        <div>
          <strong>{manifest.nFields}</strong>
          <span>USDA-estimated soybean field units</span>
        </div>
        <div>
          <strong>{manifest.nPasses}</strong>
          <span>usable Sentinel-2 acquisition dates</span>
        </div>
        <div>
          <strong>{manifest.nObservations.toLocaleString()}</strong>
          <span>
            valid field-level NDVI observations, of{' '}
            {manifest.nPossibleObservations.toLocaleString()} possible
          </span>
        </div>
        <div>
          <strong className="sse-summary__green">
            {medianNdvi === null ? '—' : medianNdvi.toFixed(2)}
          </strong>
          <span>
            median NDVI on {shortDate(dateIso)}
            {observed.length
              ? ` · ${observed.length} of ${manifest.nFields} fields measured`
              : ' · no field measurable'}
          </span>
        </div>
        <div>
          <strong className="sse-summary__blue">{formatInches(medianCumulative)}</strong>
          <span>rain since 1 May, area median</span>
        </div>
      </div>

      <div className="sse-stage">
        <div className="sse-stage__map">
          <SeasonMap
            data={data}
            ndvi={ndvi}
            rainfall={rainfall}
            day={day}
            precipLayer={precipLayer}
            showFields={showFields}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onReady={() => setMapReady(true)}
          />
          <div className="sse-overlay sse-overlay--layers">
            <LayerControls
              showFields={showFields}
              onShowFieldsChange={setShowFields}
              precipLayer={precipLayer}
              onPrecipLayerChange={setPrecipLayer}
            />
          </div>
          <div className="sse-overlay sse-overlay--legend">
            <SeasonLegend precipLayer={precipLayer} />
          </div>
          {!mapReady ? <div className="sse-map__veil">Loading satellite imagery…</div> : null}
        </div>

        <FieldPanel data={data} rainfall={rainfall} selectedFieldId={selectedFieldId} day={day} />
      </div>

      <PlaybackControls
        step={step}
        nSteps={nSteps}
        dateIso={dateIso}
        daysSincePrevious={daysSincePrevious}
        playing={playing}
        onStepChange={(next) => {
          setPlaying(false)
          setStep(next)
        }}
        onTogglePlay={() => setPlaying((current) => !current)}
      />
    </div>
  )
}
