import { useState } from 'react'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  beforeLabel: string
  afterLabel: string
  alt: string
}

// A fixed before/after imagery comparison. Deliberately not a navigable map:
// the two frames must share one geographic extent and resolution.
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  alt,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50)

  return (
    <figure className="comparison">
      <div className="comparison__viewport">
        {/* Base image fills the frame; the clipped overlay reveals the BEFORE
            scene on the left of the divider, matching the corner labels. */}
        <img className="comparison__image" src={afterSrc} alt={`${alt}, after`} />

        <div className="comparison__after" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img className="comparison__image" src={beforeSrc} alt={`${alt}, before`} />
        </div>

        <div className="comparison__divider" style={{ left: `${position}%` }} aria-hidden="true" />

        <span className="comparison__label comparison__label--before">{beforeLabel}</span>
        <span className="comparison__label comparison__label--after">{afterLabel}</span>

        <input
          className="comparison__range"
          type="range"
          min={0}
          max={100}
          value={position}
          aria-label="Compare imagery before and after the Greenfield tornado"
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
    </figure>
  )
}
