import { useEffect, useMemo, useState } from 'react'
import type { PrecipLayer, SeasonData } from '../../types/soybean-season'
import {
  buildFieldRainfall,
  buildNdviLookup,
  formatInches,
  loadSeasonData,
  peakGreennessStep,
  rainPlane,
  rainStepMm,
  shortDate,
  type NdviLookup,
} from '../../lib/soybean-season/season'
import { SeasonMap } from './SeasonMap'
import { LayerControls, SeasonLegend, Timeline } from './SeasonControls'
import { FieldPanel } from './FieldPanel'

/** One frame per usable acquisition date. Slow enough to read the date, fast
 * enough that the whole season runs in about half a minute. */
const FRAME_MS = 620

interface Stat {
  figure: string
  label: string
  tone?: 'canopy' | 'rain'
}

function StatBand({ stats }: { stats: Stat[] }) {
  return (
    <div className="sse-stats-band">
      {stats.map((stat) => (
        <div className="sse-stat" key={stat.label}>
          <span
            className={`sse-stat__figure${stat.tone ? ` sse-stat__figure--${stat.tone}` : ''}`}
          >
            {stat.figure}
          </span>
          <span className="sse-stat__label">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

export function SeasonExplorer() {
  const [data, setData] = useState<SeasonData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const [step, setStep] = useState<number | null>(null)
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

  const ndvi: NdviLookup | null = useMemo(() => (data ? buildNdviLookup(data) : null), [data])
  const rainfall = useMemo(() => (data ? buildFieldRainfall(data) : null), [data])

  // Open on the greenest date of the season rather than on 1 April, where the
  // fields are bare soil and no rain has fallen yet. The first frame is what a
  // reader sees before touching anything, so it should show the thing working.
  useEffect(() => {
    if (data && ndvi && step === null) {
      setStep(peakGreennessStep(data, ndvi))
    }
  }, [data, ndvi, step])

  const passes = data?.manifest.ndviDays ?? []
  const nSteps = passes.length
  const currentStep = step ?? 0

  useEffect(() => {
    if (!playing || nSteps === 0) {
      return
    }
    const timer = window.setInterval(() => {
      setStep((current) => {
        const at = current ?? 0
        // Stop at the end rather than looping, so the last frame stays on
        // screen instead of snapping back to bare soil.
        if (at >= nSteps - 1) {
          setPlaying(false)
          return at
        }
        return at + 1
      })
    }, FRAME_MS)
    return () => window.clearInterval(timer)
  }, [playing, nSteps])

  if (error) {
    return (
      <div className="sse-shell">
        <div className="sse-stage sse-map__veil" style={{ position: 'relative', height: 260 }}>
          <p>
            The season data could not be loaded ({error}). The explorer needs the files under{' '}
            <code>public/data/iowa-soybean-season/</code>.
          </p>
        </div>
      </div>
    )
  }

  if (!data || !ndvi || !rainfall || step === null) {
    return (
      <div className="sse-shell">
        <div className="sse-stage">
          <div className="sse-map" />
          <div className="sse-map__veil">
            Loading 248 fields, 59 usable Sentinel-2 dates and a season of rainfall…
          </div>
        </div>
      </div>
    )
  }

  const { manifest } = data
  const day = passes[Math.min(currentStep, nSteps - 1)]
  const dateIso = manifest.days[day]
  const previousDay = currentStep > 0 ? passes[currentStep - 1] : null
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
  const medianNdvi = observed.length ? observed[Math.floor(observed.length / 2)] : null

  // Area median straight off the MRMS grid for this date, so the headline
  // figure and the map are the same numbers.
  const levels = rainPlane(data, 'cumulative', currentStep)
  const noData = manifest.rain.noDataValue
  const stepMm = rainStepMm(manifest, 'cumulative')
  const cumulativeValues: number[] = []
  for (let i = 0; i < levels.length; i += 1) {
    if (levels[i] !== noData) {
      cumulativeValues.push((levels[i] * stepMm) / 25.4)
    }
  }
  cumulativeValues.sort((a, b) => a - b)
  const medianCumulative = cumulativeValues.length
    ? cumulativeValues[Math.floor(cumulativeValues.length / 2)]
    : 0

  const stats: Stat[] = [
    { figure: String(manifest.nFields), label: 'USDA-estimated soybean fields' },
    { figure: String(manifest.nPasses), label: 'Usable Sentinel-2 dates' },
    { figure: manifest.nObservations.toLocaleString(), label: 'Valid NDVI observations' },
    {
      figure: medianNdvi === null ? '—' : medianNdvi.toFixed(2),
      label: `Median NDVI on ${shortDate(dateIso)}`,
      tone: 'canopy',
    },
    {
      figure: formatInches(medianCumulative),
      label: 'Median rain since 1 May',
      tone: 'rain',
    },
  ]

  // Where each acquisition falls across the season, for the ticks on the
  // scrubber: the clear views are not evenly spaced and the control says so.
  const span = manifest.days.length - 1
  const positions = passes.map((d) => d / span)

  return (
    <>
      <StatBand stats={stats} />

      <div className="sse-shell">
        <div className="sse-stage">
          <SeasonMap
            data={data}
            ndvi={ndvi}
            day={day}
            step={currentStep}
            precipLayer={precipLayer}
            showFields={showFields}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onReady={() => setMapReady(true)}
          />

          {/* Layers and legend share one panel on the left, which keeps the
              whole right side free for the field card. */}
          <div className="sse-float sse-float--panel sse-glass">
            <LayerControls
              showFields={showFields}
              onShowFieldsChange={setShowFields}
              precipLayer={precipLayer}
              onPrecipLayerChange={setPrecipLayer}
            />
            <div className="sse-divider" />
            <SeasonLegend precipLayer={precipLayer} />
          </div>

          {selectedFieldId !== null ? (
            <FieldPanel
              data={data}
              rainfall={rainfall}
              selectedFieldId={selectedFieldId}
              day={day}
              onDismiss={() => setSelectedFieldId(null)}
            />
          ) : null}

          <Timeline
            step={currentStep}
            nSteps={nSteps}
            dateIso={dateIso}
            daysSincePrevious={daysSincePrevious}
            positions={positions}
            playing={playing}
            onStepChange={(next) => {
              setPlaying(false)
              setStep(next)
            }}
            onTogglePlay={() => setPlaying((current) => !current)}
          />

          {!mapReady ? <div className="sse-map__veil">Loading satellite imagery…</div> : null}
        </div>

        {selectedFieldId === null ? (
          <p className="sse-hint">
            Click a field to see its NDVI and rainfall history, or press play to watch the season
            unfold.
          </p>
        ) : null}
      </div>
    </>
  )
}
