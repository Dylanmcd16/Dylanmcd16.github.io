import { describe, expect, it } from 'vitest'
import {
  CAPE,
  DEWPOINT_F,
  IR_TEMPC,
  REFLECTIVITY,
  TEMPERATURE_F,
  VELOCITY_MS,
  WIND_MPH,
  type ColorStop,
  domainOf,
  gradientCss,
  ticksOf,
} from './colormaps'

// Endpoints transcribed from the pipeline's grid.py / velocity.py. If one of
// these fails, the legend has drifted from what the rasters are actually
// coloured with — which is the bug this module exists to prevent.
const PIPELINE_ENDPOINTS: [string, ColorStop[], [number, string], [number, string]][] = [
  ['REFLECTIVITY', REFLECTIVITY, [5, '#04e9e7'], [75, '#bc0000']],
  ['WIND_MPH', WIND_MPH, [0, '#e6e6eb'], [110, '#5a0a5a']],
  ['TEMPERATURE_F', TEMPERATURE_F, [30, '#440154'], [100, '#c81e1e']],
  ['DEWPOINT_F', DEWPOINT_F, [30, '#d7cdb4'], [80, '#0f3c50']],
  ['CAPE', CAPE, [250, '#ebf5ff'], [5000, '#d22828']],
  ['IR_TEMPC', IR_TEMPC, [-90, '#ff00ff'], [20, '#ebebeb']],
  ['VELOCITY_MS', VELOCITY_MS, [-40, '#00ff00'], [40, '#ff5a5a']],
]

describe('colormaps', () => {
  it.each(PIPELINE_ENDPOINTS)('%s matches the pipeline endpoints', (_name, stops, first, last) => {
    expect(stops[0]).toEqual(first)
    expect(stops[stops.length - 1]).toEqual(last)
  })

  it.each(PIPELINE_ENDPOINTS)('%s stop values ascend', (_name, stops) => {
    const values = stops.map(([value]) => value)
    expect(values).toEqual([...values].sort((a, b) => a - b))
  })

  it('positions gradient stops at their real data value, not evenly', () => {
    // 0 mph at 0%, 20 mph at 18.18% of the 0-110 domain — not 20% (1 of 5).
    const css = gradientCss(WIND_MPH)
    expect(css).toContain('#e6e6eb 0.00%')
    expect(css).toContain('#fad25a 18.18%')
    expect(css).toContain('#5a0a5a 100.00%')
  })

  it('puts the velocity zero-crossing at the centre of the ramp', () => {
    const css = gradientCss(VELOCITY_MS)
    expect(css).toContain('#878787 50.00%')
  })

  it('reports the full domain including the top stop', () => {
    expect(domainOf(WIND_MPH)).toEqual([0, 110])
    expect(domainOf(REFLECTIVITY)).toEqual([5, 75])
  })

  it('builds evenly spaced ticks across a domain', () => {
    expect(ticksOf(WIND_MPH, 3)).toEqual([0, 55, 110])
  })
})
