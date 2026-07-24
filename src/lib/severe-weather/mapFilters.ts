import type { FilterSpecification, Map } from 'maplibre-gl'

// A newly-arrived report pulses for this long after its event time.
const NEW_REPORT_WINDOW_MS = 10 * 60 * 1000

// Pure filter builders — exported so they can be unit-tested without a live map.
export function reportsFilter(currentTimeMs: number): FilterSpecification {
  return ['<=', ['get', 'event_time_ms'], currentTimeMs]
}

export function newReportPulseFilter(currentTimeMs: number): FilterSpecification {
  return [
    'all',
    ['>', ['get', 'event_time_ms'], currentTimeMs - NEW_REPORT_WINDOW_MS],
    ['<=', ['get', 'event_time_ms'], currentTimeMs],
  ]
}

export function activeWarningFilter(currentTimeMs: number): FilterSpecification {
  return [
    'all',
    ['<=', ['get', 'issued_time_ms'], currentTimeMs],
    ['>', ['get', 'expires_time_ms'], currentTimeMs],
  ]
}

export function stationFrameFilter(frameIndex: number): FilterSpecification {
  return ['==', ['get', 'frame_index'], frameIndex]
}

export function applyTimelineFilters(
  map: Map,
  frameIndex: number,
  validTimeUtc: string,
): void {
  const currentTimeMs = Date.parse(validTimeUtc)

  map.setFilter('storm-reports', reportsFilter(currentTimeMs))
  map.setFilter('new-report-pulse', newReportPulseFilter(currentTimeMs))

  const warningFilter = activeWarningFilter(currentTimeMs)
  map.setFilter('warning-fill', warningFilter)
  map.setFilter('warning-outline', warningFilter)

  const stationFilter = stationFrameFilter(frameIndex)
  map.setFilter('station-points', stationFilter)
  map.setFilter('station-labels', stationFilter)
}
