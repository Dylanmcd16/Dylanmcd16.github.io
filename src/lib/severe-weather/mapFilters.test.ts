import { describe, expect, it } from 'vitest'
import {
  activeWarningFilter,
  newReportPulseFilter,
  reportsFilter,
  stationFrameFilter,
} from './mapFilters'

describe('map filters', () => {
  it('includes every report at or before the current time', () => {
    expect(reportsFilter(1000)).toEqual(['<=', ['get', 'event_time_ms'], 1000])
  })

  it('pulses only reports within the last 10 minutes', () => {
    const tenMinutes = 10 * 60 * 1000
    expect(newReportPulseFilter(1_000_000)).toEqual([
      'all',
      ['>', ['get', 'event_time_ms'], 1_000_000 - tenMinutes],
      ['<=', ['get', 'event_time_ms'], 1_000_000],
    ])
  })

  it('keeps only warnings that are currently active', () => {
    expect(activeWarningFilter(500)).toEqual([
      'all',
      ['<=', ['get', 'issued_time_ms'], 500],
      ['>', ['get', 'expires_time_ms'], 500],
    ])
  })

  it('selects the station snapshot for the current frame', () => {
    expect(stationFrameFilter(37)).toEqual(['==', ['get', 'frame_index'], 37])
  })
})
