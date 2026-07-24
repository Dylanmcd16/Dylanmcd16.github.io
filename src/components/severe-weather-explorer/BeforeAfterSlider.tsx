import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

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
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)

  const setFromClientX = useCallback((clientX: number) => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, pct)))
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // On touch, only the handle starts a drag so the page can still scroll
      // over the image body. A mouse can grab anywhere.
      const onHandle = (event.target as HTMLElement).closest('.comparison__handle')
      if (event.pointerType === 'touch' && !onHandle) return
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setFromClientX(event.clientX)
    },
    [setFromClientX],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (draggingRef.current) setFromClientX(event.clientX)
    },
    [setFromClientX],
  )

  const endDrag = useCallback(() => {
    draggingRef.current = false
  }, [])

  return (
    <figure className="comparison">
      <div
        className="comparison__viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Base image fills the frame; the clipped overlay reveals the BEFORE
            scene on the left of the divider, matching the corner labels. */}
        <img className="comparison__image" src={afterSrc} alt={`${alt}, after`} draggable={false} />

        <div className="comparison__after" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img className="comparison__image" src={beforeSrc} alt={`${alt}, before`} draggable={false} />
        </div>

        <div className="comparison__divider" style={{ left: `${position}%` }} aria-hidden="true">
          <span className="comparison__handle">
            <span aria-hidden="true">‹</span>
            <span aria-hidden="true">›</span>
          </span>
        </div>

        <span className="comparison__label comparison__label--before">{beforeLabel}</span>
        <span className="comparison__label comparison__label--after">{afterLabel}</span>

        {/* Keyboard / screen-reader control. pointer-events disabled so touches
            pass through to the handle and page scroll. */}
        <input
          className="comparison__range"
          type="range"
          min={0}
          max={100}
          value={Math.round(position)}
          aria-label="Compare imagery before and after the Greenfield tornado"
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
    </figure>
  )
}
