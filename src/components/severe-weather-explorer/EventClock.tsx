interface EventClockProps {
  displayTimeCentral: string
  validTimeUtc: string
}

// The prominent "where are we in the event" readout.
export function EventClock({ displayTimeCentral, validTimeUtc }: EventClockProps) {
  return (
    <div className="swx-clock">
      <span className="swx-clock__time">{displayTimeCentral}</span>
      <span className="swx-clock__utc">{validTimeUtc.replace('T', ' ').replace('Z', ' UTC')}</span>
    </div>
  )
}
