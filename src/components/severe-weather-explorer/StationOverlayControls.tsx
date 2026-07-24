import type { StationOverlay } from '../../lib/severe-weather/mapTypes'

interface StationOverlayControlsProps {
  stationOverlay: StationOverlay
  onStationOverlay: (overlay: StationOverlay) => void
  unavailable?: boolean
}

const OVERLAYS: { value: StationOverlay; label: string }[] = [
  { value: 'none', label: 'Off' },
  { value: 'temperature', label: 'Temp' },
  { value: 'dewpoint', label: 'Dew pt' },
  { value: 'wind', label: 'Wind' },
  { value: 'gust', label: 'Gust' },
]

export function StationOverlayControls({
  stationOverlay,
  onStationOverlay,
  unavailable,
}: StationOverlayControlsProps) {
  return (
    <div className="swx-control">
      <h3 className="swx-control__title">
        Surface observations{unavailable && ' (unavailable)'}
      </h3>
      <div className="swx-segmented" role="group" aria-label="Surface observation overlay">
        {OVERLAYS.map((overlay) => (
          <button
            key={overlay.value}
            type="button"
            className={`swx-segmented__button ${
              stationOverlay === overlay.value ? 'is-active' : ''
            }`}
            aria-pressed={stationOverlay === overlay.value}
            disabled={unavailable && overlay.value !== 'none'}
            onClick={() => onStationOverlay(overlay.value)}
          >
            {overlay.label}
          </button>
        ))}
      </div>
    </div>
  )
}
