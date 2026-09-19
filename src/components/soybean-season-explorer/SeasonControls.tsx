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
// Layer controls
// ---------------------------------------------------------------------------

interface LayerControlsProps {
  showFields: boolean
  onShowFieldsChange: (value: boolean) => void
  precipLayer: PrecipLayer
  onPrecipLayerChange: (value: PrecipLayer) => void
}

const PRECIP_OPTIONS: { id: PrecipLayer; label: string }[] = [
  { id: 'none', label: 'Off' },
  { id: 'cumulative', label: 'Since 1 May' },
  { id: 'trailing14', label: 'Last 14 d' },
]

/** A switch for the fields, a segmented control for the rainfall window.
 *
 * The shapes carry the meaning. The fields are one thing that is on or off;
 * the rainfall windows are three alternatives with exactly one selected.
 * Cumulative and trailing rainfall have to be alternatives rather than
 * independent switches — they are the same quantity over different windows, so
 * stacking both would put two blues on the same pixels and mean nothing.
 */
export function LayerControls({
  showFields,
  onShowFieldsChange,
  precipLayer,
  onPrecipLayerChange,
}: LayerControlsProps) {
  return (
    <div>
      <p className="sse-eyebrow">Layers</p>

      <label className="sse-toggle">
        <span>Soybean fields</span>
        <input
          type="checkbox"
          checked={showFields}
          onChange={(event) => onShowFieldsChange(event.target.checked)}
        />
        <span className="sse-toggle__track" aria-hidden="true" />
      </label>

      <div className="sse-divider" />

      <p className="sse-eyebrow">Rainfall</p>
      <fieldset className="sse-segmented">
        <legend>Rainfall overlay window</legend>
        {PRECIP_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`sse-segment${precipLayer === option.id ? ' sse-segment--on' : ''}`}
          >
            <input
              type="radio"
              name="sse-precip-layer"
              value={option.id}
              checked={precipLayer === option.id}
              onChange={() => onPrecipLayerChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend
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
 * thing on every date and the animation can be read as change. */
export function SeasonLegend({ precipLayer }: { precipLayer: PrecipLayer }) {
  return (
    <div className="sse-legend">
      <Ramp
        label="Field NDVI"
        stops={NDVI_STOPS}
        format={(value) => value.toFixed(2)}
        note="Bare soil to closed canopy. A hollow outline means the field was clouded out on this date."
      />
      {precipLayer === 'cumulative' ? (
        <Ramp
          label="Rain since 1 May"
          stops={CUMULATIVE_STOPS}
          format={(value) => formatInches(value, 0)}
          note="Daymet, sampled on a ~1 km grid and smoothed for display."
        />
      ) : null}
      {precipLayer === 'trailing14' ? (
        <Ramp
          label="Rain, last 14 days"
          stops={TRAILING_STOPS}
          format={(value) => formatInches(value, 0)}
          note="Daymet, sampled on a ~1 km grid and smoothed for display."
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 14" aria-hidden="true">
      <path d="M1.5 1l9 6-9 6z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 12 14" aria-hidden="true">
      <path d="M1.4 1h3.1v12H1.4zM7.5 1h3.1v12H7.5z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 12 14" aria-hidden="true">
      <path d="M10.5 1l-9 6 9 6z" />
    </svg>
  )
}

function ForwardIcon() {
  return (
    <svg viewBox="0 0 12 14" aria-hidden="true">
      <path d="M1.5 1l9 6-9 6z" />
    </svg>
  )
}

interface TimelineProps {
  /** Index into the list of usable acquisition dates, not a calendar day. */
  step: number
  nSteps: number
  dateIso: string
  daysSincePrevious: number | null
  /** Each acquisition's position across the season, 0 to 1, for the ticks. */
  positions: number[]
  playing: boolean
  onStepChange: (step: number) => void
  onTogglePlay: () => void
}

export function Timeline({
  step,
  nSteps,
  dateIso,
  daysSincePrevious,
  positions,
  playing,
  onStepChange,
  onTogglePlay,
}: TimelineProps) {
  const progress = nSteps > 1 ? step / (nSteps - 1) : 0

  return (
    <div className="sse-timeline sse-glass">
      <button
        type="button"
        className="sse-transport sse-transport--play"
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause the season' : 'Play the season'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className="sse-transport"
        onClick={() => onStepChange(Math.max(0, step - 1))}
        disabled={step === 0}
        aria-label="Previous acquisition date"
      >
        <BackIcon />
      </button>
      <button
        type="button"
        className="sse-transport"
        onClick={() => onStepChange(Math.min(nSteps - 1, step + 1))}
        disabled={step === nSteps - 1}
        aria-label="Next acquisition date"
      >
        <ForwardIcon />
      </button>

      <div className="sse-clock">
        <span className="sse-clock__date">{longDate(dateIso)}</span>
        <span className="sse-clock__meta">
          Date {step + 1} of {nSteps}
          {daysSincePrevious === null
            ? ' · first usable acquisition'
            : ` · ${daysSincePrevious} ${daysSincePrevious === 1 ? 'day' : 'days'} since the last`}
        </span>
      </div>

      {/* The ticks sit at each acquisition's true position in the season, so
          the uneven spacing of clear views is visible in the control itself
          rather than only in the dates as they go past. */}
      <div className="sse-scrub">
        <div className="sse-scrub__ticks" aria-hidden="true">
          {positions.map((position, index) => (
            <span
              key={index}
              className="sse-scrub__tick"
              style={{ left: `${position * 100}%` }}
            />
          ))}
        </div>
        <div
          className="sse-scrub__fill"
          aria-hidden="true"
          style={{ width: `calc((100% - 18px) * ${progress})` }}
        />
        <input
          type="range"
          min={0}
          max={nSteps - 1}
          step={1}
          value={step}
          onChange={(event) => onStepChange(Number(event.target.value))}
          aria-label="Usable Sentinel-2 acquisition date"
          aria-valuetext={longDate(dateIso)}
        />
      </div>
    </div>
  )
}
