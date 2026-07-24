interface PlaybackControlsProps {
  frameIndex: number
  frameCount: number
  isPlaying: boolean
  speed: number
  startLabel: string
  endLabel: string
  onRestart: () => void
  onPrevious: () => void
  onTogglePlay: () => void
  onNext: () => void
  onScrub: (index: number) => void
  onSpeed: (speed: number) => void
}

const SPEEDS = [0.5, 1, 2]

export function PlaybackControls({
  frameIndex,
  frameCount,
  isPlaying,
  speed,
  startLabel,
  endLabel,
  onRestart,
  onPrevious,
  onTogglePlay,
  onNext,
  onScrub,
  onSpeed,
}: PlaybackControlsProps) {
  const lastFrame = Math.max(0, frameCount - 1)

  return (
    <div className="swx-playback">
      <div className="swx-playback__buttons">
        <button type="button" className="swx-icon-button" onClick={onRestart} aria-label="Restart">
          ⏮
        </button>
        <button type="button" className="swx-icon-button" onClick={onPrevious} aria-label="Previous frame">
          ◀
        </button>
        <button
          type="button"
          className="swx-icon-button swx-icon-button--primary"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '►'}
        </button>
        <button type="button" className="swx-icon-button" onClick={onNext} aria-label="Next frame">
          ▶
        </button>
      </div>

      <div className="swx-playback__track">
        <span className="swx-playback__edge">{startLabel}</span>
        <input
          type="range"
          min={0}
          max={lastFrame}
          step={1}
          value={frameIndex}
          aria-label="Event timeline"
          onChange={(event) => onScrub(Number(event.target.value))}
        />
        <span className="swx-playback__edge">{endLabel}</span>
      </div>

      <div className="swx-playback__speed" role="group" aria-label="Playback speed">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={`swx-chip ${speed === value ? 'is-active' : ''}`}
            onClick={() => onSpeed(value)}
          >
            {value}×
          </button>
        ))}
      </div>
    </div>
  )
}
