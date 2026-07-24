/**
 * Colour ramps mirrored from the Python pipeline.
 *
 * Every ramp here is a literal transcription of the stops in
 * `weather-geospatial/examples/iowa-severe-weather-explorer/src/iowa_severe_weather/`
 * — `grid.py` (COLORMAPS) and `velocity.py`. Stops carry their real data value,
 * not just a colour, so the legend gradient can place each transition at the
 * position it actually occupies in the data rather than spacing them evenly.
 *
 * If a ramp changes in the pipeline, change it here too; `colormaps.test.ts`
 * guards the endpoints.
 */

export type ColorStop = [value: number, color: string]

/** grid.py — REFLECTIVITY (dBZ) */
export const REFLECTIVITY: ColorStop[] = [
  [5, '#04e9e7'],
  [20, '#019ff4'],
  [30, '#0300f4'],
  [35, '#02fd02'],
  [40, '#01c501'],
  [45, '#008e00'],
  [50, '#fdf802'],
  [55, '#e5bc00'],
  [60, '#fd9500'],
  [65, '#fd0000'],
  [70, '#d40000'],
  [75, '#bc0000'],
]

/** grid.py — WIND_MPH, shared by wind_gust and wind_speed_10m */
export const WIND_MPH: ColorStop[] = [
  [0, '#e6e6eb'],
  [20, '#fad25a'],
  [40, '#f58228'],
  [60, '#dc2828'],
  [80, '#961e78'],
  [110, '#5a0a5a'],
]

/** grid.py — TEMPERATURE_F */
export const TEMPERATURE_F: ColorStop[] = [
  [30, '#440154'],
  [45, '#3b528b'],
  [60, '#21918c'],
  [70, '#5ec962'],
  [80, '#fde725'],
  [90, '#f08228'],
  [100, '#c81e1e'],
]

/** grid.py — DEWPOINT_F */
export const DEWPOINT_F: ColorStop[] = [
  [30, '#d7cdb4'],
  [45, '#96be78'],
  [55, '#46a06e'],
  [65, '#1e785a'],
  [72, '#145a5a'],
  [80, '#0f3c50'],
]

/** grid.py — CAPE (J/kg) */
export const CAPE: ColorStop[] = [
  [250, '#ebf5ff'],
  [1000, '#78c8fa'],
  [2000, '#5ac878'],
  [3000, '#fadc46'],
  [4000, '#f58228'],
  [5000, '#d22828'],
]

/** grid.py — IR_TEMPC, GOES-16 ABI band 13 brightness temperature (°C) */
export const IR_TEMPC: ColorStop[] = [
  [-90, '#ff00ff'],
  [-80, '#ff0000'],
  [-70, '#ffaa00'],
  [-60, '#ffff00'],
  [-50, '#00b400'],
  [-40, '#0078dc'],
  [-30, '#282828'],
  [20, '#ebebeb'],
]

/** velocity.py — diverging base radial velocity (m/s) */
export const VELOCITY_MS: ColorStop[] = [
  [-40, '#00ff00'],
  [-25, '#00af00'],
  [-8, '#19501e'],
  [0, '#878787'],
  [8, '#5f1919'],
  [25, '#c80000'],
  [40, '#ff5a5a'],
]

export function domainOf(stops: ColorStop[]): [number, number] {
  return [stops[0][0], stops[stops.length - 1][0]]
}

/**
 * A CSS gradient whose colour positions match the data values. Evenly spacing
 * the stops (the usual shortcut) puts every transition at the wrong value.
 */
export function gradientCss(stops: ColorStop[], angle = '90deg'): string {
  const [min, max] = domainOf(stops)
  const span = max - min || 1
  const parts = stops.map(([value, color]) => {
    const pct = ((value - min) / span) * 100
    return `${color} ${pct.toFixed(2)}%`
  })
  return `linear-gradient(${angle}, ${parts.join(', ')})`
}

/** Evenly spaced tick labels across a ramp's domain, for legend scales. */
export function ticksOf(stops: ColorStop[], count = 2): number[] {
  const [min, max] = domainOf(stops)
  if (count < 2) return [min, max]
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1))
}

export const MS_TO_KT = 1.94384
