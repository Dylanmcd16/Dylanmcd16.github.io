import type { PrecipLayer } from '../../types/soybean-season'
import {
  CUMULATIVE_STOPS,
  NDVI_STOPS,
  TRAILING_STOPS,
  formatInches,
  longDate,
  stopsToCss,
  type ColourStop,
} from '../../lib/soybean-season/season'

// ---------------------------------------------------------------------------
// Layer switches
// ---------------------------------------------------------------------------

interface LayerControlsProps {
  showFields: boolean
  onShowFieldsChange: (value: boolean) => void
  precipLayer: PrecipLayer
  onPrecipLayerChange: (value: PrecipLayer) => void
}

/** Fields are a switch; the two rainfall layers are alternatives.
 *
 * Cumulative and trailing rainfall are mutually exclusive because they are the
 * same quantity over different windows — showing both at once would stack two
 * blues on the same pixels and mean nothing.
 */
export function LayerControls({
  showFields,
  onShowFieldsChange,
  precipLayer,
  onPrecipLayerChange,
}: LayerControlsProps) {
  return (
    <div className="sse-layers">
      <p className="sse-layers__heading">Layers</p>

      <label className="sse-switch">
        <input
          type="checkbox"
          checked={showFields}
          onChange={(event) => onShowFieldsChange(event.target.checked)}
        />
        <span>Soybean fields, coloured by NDVI</span>
      </label>

      <p className="sse-layers__subheading" id="sse-rain-group">
        Rainfall overlay
      </p>
      <div className="sse-radios" role="radiogroup" aria-labelledby="sse-rain-group">
        {(
          [
            { id: 'none', label: 'Off' },
            { id: 'cumulative', label: 'Cumulative since 1 May' },
            { id: 'trailing14', label: 'Last 14 days' },
          ] as { id: PrecipLayer; label: string }[]
        ).map((option) => (
          <label className="sse-switch" key={option.id}>
            <input
              type="radio"
              name="sse-precip-layer"
              checked={precipLayer === option.id}
              onChange={() => onPrecipLayerChange(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legends
// ---------------------------------------------------------------------------

function Ramp({
  label,
  stops,
  format,
  note,
}: {
  label: string
  stops: ColourStop[]
  format: (value: number) => string
  note?: string
}) {
  return (
    <div className="sse-ramp">
      <p className="sse-ramp__label">{label}</p>
      <div className="sse-ramp__bar" style={{ background: stopsToCss(stops) }} />
      <div className="sse-ramp__ticks">
        {stops.map((stop) => (
          <span key={stop.value}>{format(stop.value)}</span>
        ))}
      </div>
      {note ? <p className="sse-ramp__note">{note}</p> : null}
    </div>
  )
}

/** Both scales are fixed for the whole season, so a colour means the same
 * thing on every pass and the animation can be read as change. */
export function SeasonLegend({ precipLayer }: { precipLayer: PrecipLayer }) {
  return (
    <div className="sse-legend">
      <Ramp
        label="Field NDVI"
        stops={NDVI_STOPS}
        format={(value) => value.toFixed(2)}
        note="Bare soil to closed canopy. Hollow outline means cloud on this pass."
      />
      {precipLayer === 'cumulative' ? (
        <Ramp
          label="Rain since 1 May"
          stops={CUMULATIVE_STOPS}
          format={(value) => formatInches(value, 0)}
          note="Daymet 1 km estimate, smoothed for display."
        />
      ) : null}
      {precipLayer === 'trailing14' ? (
        <Ramp
          label="Rain, last 14 days"
          stops={TRAILING_STOPS}
          format={(value) => formatInches(value, 0)}
          note="Daymet 1 km estimate, smoothed for display."
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

interface PlaybackProps {
  /** Index into the list of clear passes, not a calendar day. */
  step: number
  nSteps: number
  dateIso: string
  daysSincePrevious: number | null
  playing: boolean
  onStepChange: (step: number) => void
  onTogglePlay: () => void
}

export function PlaybackControls({
  step,
  nSteps,
  dateIso,
  daysSincePrevious,
  playing,
  onStepChange,
  onTogglePlay,
}: PlaybackProps) {
  return (
    <div className="sse-playback">
      <button
        type="button"
        className="sse-play"
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause the season' : 'Play the season'}
      >
        {playing ? '❙❙' : '▶'}
      </button>
      <button
        type="button"
        className="sse-step"
        onClick={() => onStepChange(Math.max(0, step - 1))}
        disabled={step === 0}
        aria-label="Previous clear pass"
      >
        ←
      </button>
      <button
        type="button"
        className="sse-step"
        onClick={() => onStepChange(Math.min(nSteps - 1, step + 1))}
        disabled={step === nSteps - 1}
        aria-label="Next clear pass"
      >
        →
      </button>

      <div className="sse-playback__clock">
        <strong>{longDate(dateIso)}</strong>
        <span>
          Pass {step + 1} of {nSteps}
          {daysSincePrevious === null
            ? ' · first clear view of the season'
            : ` · ${daysSincePrevious} ${daysSincePrevious === 1 ? 'day' : 'days'} since the previous one`}
        </span>
      </div>

      <input
        className="sse-slider"
        type="range"
        min={0}
        max={nSteps - 1}
        step={1}
        value={step}
        onChange={(event) => onStepChange(Number(event.target.value))}
        aria-label="Clear Sentinel-2 pass"
      />
    </div>
  )
}
