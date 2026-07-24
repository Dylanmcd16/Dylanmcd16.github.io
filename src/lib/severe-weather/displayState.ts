import type { Map } from 'maplibre-gl'
import type { ExplorerDisplayState } from './mapTypes'

function setVisibility(map: Map, layerId: string, visible: boolean): void {
  if (!map.getLayer(layerId)) {
    return
  }

  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

// Resolve which layers should be visible for a display state.
// Exported for unit testing without a live map.
export function resolveLayerVisibility(state: ExplorerDisplayState) {
  const showRadar = state.primaryLayer === 'radar'
  const showSatellite =
    state.primaryLayer === 'satellite' || (showRadar && state.satelliteUnderRadar)
  const showHrrr = state.primaryLayer === 'hrrr'
  const showStations = state.stationOverlay !== 'none'

  return { showRadar, showSatellite, showHrrr, showStations }
}

export function applyDisplayState(map: Map, state: ExplorerDisplayState): void {
  const { showRadar, showSatellite, showHrrr, showStations } = resolveLayerVisibility(state)

  setVisibility(map, 'radar-layer', showRadar)
  setVisibility(map, 'satellite-layer', showSatellite)
  setVisibility(map, 'hrrr-layer', showHrrr)

  setVisibility(map, 'storm-reports', state.showReports)
  setVisibility(map, 'new-report-pulse', state.showReports)

  setVisibility(map, 'warning-fill', state.showWarnings)
  setVisibility(map, 'warning-outline', state.showWarnings)

  setVisibility(map, 'assessment-fill', state.showPostEventAssessments)
  setVisibility(map, 'assessment-outline', state.showPostEventAssessments)
  setVisibility(map, 'assessment-points', state.showPostEventAssessments)

  setVisibility(map, 'station-points', showStations)
  setVisibility(map, 'station-labels', showStations)
}
