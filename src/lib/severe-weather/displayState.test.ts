import { describe, expect, it } from 'vitest'
import { resolveLayerVisibility } from './displayState'
import type { ExplorerDisplayState } from './mapTypes'

const base: ExplorerDisplayState = {
  primaryLayer: 'radar',
  satelliteUnderRadar: false,
  satelliteProduct: 'sandwich',
  stationOverlay: 'none',
  hrrrVariable: 'composite_reflectivity',
  showReports: true,
  showWarnings: true,
  showPostEventAssessments: false,
}

describe('resolveLayerVisibility', () => {
  it('shows only radar by default', () => {
    expect(resolveLayerVisibility(base)).toEqual({
      showRadar: true,
      showSatellite: false,
      showHrrr: false,
      showStations: false,
    })
  })

  it('shows satellite beneath radar when requested', () => {
    const v = resolveLayerVisibility({ ...base, satelliteUnderRadar: true })
    expect(v.showRadar).toBe(true)
    expect(v.showSatellite).toBe(true)
  })

  it('makes HRRR exclusive with radar', () => {
    const v = resolveLayerVisibility({ ...base, primaryLayer: 'hrrr' })
    expect(v.showHrrr).toBe(true)
    expect(v.showRadar).toBe(false)
  })

  it('enables stations when an overlay is selected', () => {
    expect(resolveLayerVisibility({ ...base, stationOverlay: 'temperature' }).showStations).toBe(true)
  })
})
