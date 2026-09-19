/** Loading and derivation for the Iowa Soybean Season Explorer.
 *
 * Everything expensive happens once, at load: the NDVI lookup and the per-field
 * rainfall totals. The playback loop then only reads precomputed numbers and
 * one slice of an already-decoded byte array, which is what keeps a 59-step
 * autoplay smooth with 248 fields and a 48 × 60 rainfall grid on the map.
 */

import type {
  FieldProperties,
  NdviSeries,
  PrecipLayer,
  RainFields,
  SeasonData,
  SeasonManifest,
} from '../../types/soybean-season'

const MM_PER_INCH = 25.4
const TRAILING_DAYS = 14

/** Build asset URLs against the deployed base path. */
export function seasonAssetUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath.replace(/^\/+/, '')}`
}

const DATA_ROOT = 'data/iowa-soybean-season/'

async function getJson<T>(file: string): Promise<T> {
  const response = await fetch(seasonAssetUrl(DATA_ROOT + file))
  if (!response.ok) {
    throw new Error(`${file}: HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

export async function loadSeasonData(): Promise<SeasonData> {
  const manifest = await getJson<SeasonManifest>('manifest.json')
  const [fields, ndvi, rainFields, rainGrids] = await Promise.all([
    getJson<SeasonData['fields']>(manifest.files.fields),
    getJson<SeasonData['ndvi']>(manifest.files.ndvi),
    getJson<RainFields>(manifest.rain.fieldFile),
    fetch(seasonAssetUrl(DATA_ROOT + manifest.rain.gridFile)).then(async (response) => {
      if (!response.ok) {
        throw new Error(`${manifest.rain.gridFile}: HTTP ${response.status}`)
      }
      return new Uint8Array(await response.arrayBuffer())
    }),
  ])

  // The binary carries no shape of its own, so it is checked against the
  // manifest rather than trusted: a truncated fetch would otherwise paint a
  // plausible-looking but wrong rainfall map.
  const expected = manifest.rain.nRows * manifest.rain.nCols * manifest.ndviDays.length * 2
  if (rainGrids.length !== expected) {
    throw new Error(`rain grid is ${rainGrids.length} bytes, expected ${expected}`)
  }

  return { manifest, fields, ndvi, rainGrids, rainFields }
}

// ---------------------------------------------------------------------------
// NDVI
// ---------------------------------------------------------------------------

/** Field id -> (day index -> NDVI). Absent means cloud, not zero. */
export type NdviLookup = Map<number, Map<number, number>>

export function buildNdviLookup(data: SeasonData): NdviLookup {
  const lookup: NdviLookup = new Map()
  for (const [fieldId, series] of Object.entries(data.ndvi)) {
    const byDay = new Map<number, number>()
    series.d.forEach((day, i) => {
      const value = series.v[i]
      if (value !== null && value !== undefined) {
        byDay.set(day, value)
      }
    })
    lookup.set(Number(fieldId), byDay)
  }
  return lookup
}

// ---------------------------------------------------------------------------
// The MRMS grid
// ---------------------------------------------------------------------------

/** One date's grid for one window, as quantisation levels on the native grid.
 *
 * The binary holds every cumulative grid first, then every trailing grid, each
 * row-major with the north row first. No copy is made — this is a view.
 */
export function rainPlane(
  data: SeasonData,
  layer: Exclude<PrecipLayer, 'none'>,
  step: number,
): Uint8Array {
  const { nRows, nCols } = data.manifest.rain
  const cells = nRows * nCols
  const planeIndex = data.manifest.rain.planeOrder.indexOf(layer)
  const offset = (planeIndex * data.manifest.ndviDays.length + step) * cells
  return data.rainGrids.subarray(offset, offset + cells)
}

/** Millimetres per quantisation level for one window. */
export function rainStepMm(
  manifest: SeasonManifest,
  layer: Exclude<PrecipLayer, 'none'>,
): number {
  return layer === 'cumulative' ? manifest.rain.cumulativeStepMm : manifest.rain.trailingStepMm
}

/** Image corner coordinates, clockwise from top-left, for an image source. */
export function rainCoordinates(
  manifest: SeasonManifest,
): [[number, number], [number, number], [number, number], [number, number]] {
  const [west, south, east, north] = manifest.rain.bounds
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ]
}

// ---------------------------------------------------------------------------
// Per-field rainfall
// ---------------------------------------------------------------------------

export interface FieldRainfall {
  /** All in inches, indexed by the season's day index. */
  daily: Float32Array
  cumulative: Float32Array
  trailing14: Float32Array
}

/** Field id -> its rainfall series, in inches, on the season's day index.
 *
 * The exported per-field record starts thirteen days before the season so the
 * earliest trailing window is complete; this re-indexes onto the season's own
 * days so the rainfall charts and the NDVI series share one x-axis.
 *
 * A null day is MRMS having no data there, which contributes nothing to a sum
 * rather than counting as zero rainfall.
 */
export function buildFieldRainfall(data: SeasonData): Map<number, FieldRainfall> {
  const { rainFields, manifest } = data
  const nDays = manifest.days.length
  const offset = rainFields.seasonStartIndex
  const out = new Map<number, FieldRainfall>()

  for (const [fieldId, series] of Object.entries(rainFields.mm)) {
    const daily = new Float32Array(nDays)
    const cumulative = new Float32Array(nDays)
    const trailing = new Float32Array(nDays)

    let running = 0
    for (let day = 0; day < nDays; day += 1) {
      const source = offset + day
      const inches = (series[source] ?? 0) / MM_PER_INCH
      daily[day] = inches
      if (source >= rainFields.rainZeroIndex) {
        running += inches
      }
      cumulative[day] = running

      let window = 0
      for (let back = source - TRAILING_DAYS + 1; back <= source; back += 1) {
        if (back >= 0) {
          window += (series[back] ?? 0) / MM_PER_INCH
        }
      }
      trailing[day] = window
    }

    out.set(Number(fieldId), { daily, cumulative, trailing14: trailing })
  }
  return out
}

// ---------------------------------------------------------------------------
// Colour scales, fixed for the whole season
// ---------------------------------------------------------------------------

export interface ColourStop {
  value: number
  colour: string
  /** 0-1. Rainfall ramps carry their own alpha so dry ground stays readable. */
  alpha?: number
}

/** Bare soil through closed canopy. Fixed so dates are comparable. */
export const NDVI_STOPS: ColourStop[] = [
  { value: 0.1, colour: '#ddcfa8' },
  { value: 0.25, colour: '#cbcc84' },
  { value: 0.4, colour: '#a9c064' },
  { value: 0.55, colour: '#7ba94e' },
  { value: 0.7, colour: '#4e8b3c' },
  { value: 0.85, colour: '#2c6a30' },
  { value: 0.95, colour: '#164a24' },
]

/* The rainfall ramps carry alpha as well as colour, which is the difference
   between a legible rainfall map and a blue film over the whole county. A flat
   38% wash made dry ground and a soaking indistinguishable, because both sat in
   the pale end of the ramp. Letting alpha climb with depth means nothing is
   drawn where nothing fell, the imagery stays readable underneath, and a storm
   reads as a storm. The scales are still fixed for the season -- a colour and
   an opacity together mean one depth, on every frame. */

/** Season accumulation, in inches, capped at the export's 36 in display max.
 * Across the area the season ends between about 22 and 30 inches. */
export const CUMULATIVE_STOPS: ColourStop[] = [
  { value: 0, colour: '#eef6fd', alpha: 0 },
  { value: 6, colour: '#c3ddf2', alpha: 0.12 },
  { value: 12, colour: '#8fc0e6', alpha: 0.2 },
  { value: 18, colour: '#5b9ed6', alpha: 0.28 },
  { value: 24, colour: '#3277bd', alpha: 0.35 },
  { value: 30, colour: '#1b5596', alpha: 0.41 },
  { value: 36, colour: '#0d3468', alpha: 0.46 },
]

/** Recent wet or dry, in inches, capped at the export's 8 in display max.
 * A fortnight is under 2 inches on half the dates and over 5 on a handful, so
 * most of the contrast is spent below 4. */
export const TRAILING_STOPS: ColourStop[] = [
  { value: 0, colour: '#ffffff', alpha: 0 },
  { value: 0.5, colour: '#dbeaf7', alpha: 0.18 },
  { value: 1, colour: '#b5d5ef', alpha: 0.32 },
  { value: 2, colour: '#7fb5e2', alpha: 0.46 },
  { value: 3, colour: '#4e91d0', alpha: 0.58 },
  { value: 4.5, colour: '#2a68b0', alpha: 0.68 },
  { value: 6, colour: '#1b4a8a', alpha: 0.76 },
  { value: 8, colour: '#0d2d5e', alpha: 0.84 },
]

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function withAlpha(stop: ColourStop): [number, number, number, number] {
  const [r, g, b] = parseHex(stop.colour)
  return [r, g, b, Math.round((stop.alpha ?? 1) * 255)]
}

/** Linear interpolation through a stop list, clamped at both ends.
 *
 * Returns RGBA: the rainfall ramps interpolate their opacity along with their
 * colour, so a light shower fades out rather than turning pale blue.
 */
export function sampleStops(
  stops: ColourStop[],
  value: number,
): [number, number, number, number] {
  if (!Number.isFinite(value) || value <= stops[0].value) {
    return withAlpha(stops[0])
  }
  const last = stops[stops.length - 1]
  if (value >= last.value) {
    return withAlpha(last)
  }
  for (let i = 1; i < stops.length; i += 1) {
    if (value <= stops[i].value) {
      const lower = stops[i - 1]
      const upper = stops[i]
      const t = (value - lower.value) / (upper.value - lower.value)
      const a = withAlpha(lower)
      const b = withAlpha(upper)
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
        Math.round(a[3] + (b[3] - a[3]) * t),
      ]
    }
  }
  return withAlpha(last)
}

/** The ramp as a CSS gradient for the legend swatch, drawn opaque: the bar
 * has to show what the colours are, not how transparent they will be. */
export function stopsToCss(stops: ColourStop[]): string {
  const span = stops[stops.length - 1].value - stops[0].value
  const parts = stops.map((stop) => {
    const pct = ((stop.value - stops[0].value) / span) * 100
    return `${stop.colour} ${pct.toFixed(1)}%`
  })
  return `linear-gradient(to right, ${parts.join(', ')})`
}

/** A 256-entry level -> RGB lookup, built once per window.
 *
 * Running 6,048 cells through the stop list on every frame would repeat the
 * same interpolation thousands of times for nothing, and there are only 256
 * possible inputs.
 */
export function buildLevelPalette(stops: ColourStop[], stepMm: number): Uint8Array {
  const palette = new Uint8Array(256 * 4)
  for (let level = 0; level < 256; level += 1) {
    const inches = (level * stepMm) / MM_PER_INCH
    const [r, g, b, a] = sampleStops(stops, inches)
    palette[level * 4] = r
    palette[level * 4 + 1] = g
    palette[level * 4 + 2] = b
    palette[level * 4 + 3] = a
  }
  return palette
}

/** The NDVI ramp as a MapLibre interpolate expression over a feature state. */
export function ndviColourExpression(): unknown[] {
  const expression: unknown[] = [
    'interpolate',
    ['linear'],
    ['coalesce', ['feature-state', 'ndvi'], 0],
  ]
  for (const stop of NDVI_STOPS) {
    expression.push(stop.value, stop.colour)
  }
  return expression
}

// ---------------------------------------------------------------------------
// Opening frame
// ---------------------------------------------------------------------------

/** The acquisition index with the highest median NDVI across the fields.
 *
 * The season starts on 1 April, where the fields are bare soil and no rain has
 * fallen — the least representative frame there is, and the one a reader would
 * otherwise meet first. Opening on the greenest date shows the product doing
 * its job. The date is real and labelled, so nothing is misrepresented; only
 * the starting position changes.
 */
export function peakGreennessStep(data: SeasonData, ndvi: NdviLookup): number {
  const passes = data.manifest.ndviDays
  let bestStep = 0
  let bestMedian = -Infinity

  passes.forEach((day, index) => {
    const values: number[] = []
    for (const byDay of ndvi.values()) {
      const value = byDay.get(day)
      if (value !== undefined) {
        values.push(value)
      }
    }
    if (values.length < data.manifest.nFields * 0.5) {
      // Skip dates where most fields were clouded out: a high median over a
      // handful of fields is not a picture of the area.
      return
    }
    values.sort((a, b) => a - b)
    const median = values[Math.floor(values.length / 2)]
    if (median > bestMedian) {
      bestMedian = median
      bestStep = index
    }
  })

  return bestStep
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** "9 Jul" from an ISO date, without pulling in a date library. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(day)} ${MONTHS[Number(month) - 1]}`
}

export function longDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`
}

export function formatInches(value: number, digits = 1): string {
  return `${value.toFixed(digits)}"`
}

/** Field polygon bounds, for zooming to a clicked field. */
export function featureBounds(
  feature: GeoJSON.Feature<GeoJSON.MultiPolygon, FieldProperties>,
): [[number, number], [number, number]] {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const polygon of feature.geometry.coordinates) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        west = Math.min(west, lon)
        south = Math.min(south, lat)
        east = Math.max(east, lon)
        north = Math.max(north, lat)
      }
    }
  }
  return [
    [west, south],
    [east, north],
  ]
}

export type { FieldProperties, NdviSeries }
