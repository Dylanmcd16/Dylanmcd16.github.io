/** Loading and derivation for the Iowa Soybean Season Explorer.
 *
 * Everything expensive happens once, at load: the NDVI lookup, the cumulative
 * and trailing rainfall totals, and the raster grid layout. The playback loop
 * then only reads precomputed numbers, which is what keeps a 59-step autoplay
 * smooth with 248 fields and 806 rainfall sample points on the map.
 */

import type {
  FieldProperties,
  GridCellProperties,
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
  const [fields, grid, ndvi, precipDaily] = await Promise.all([
    getJson<SeasonData['fields']>(manifest.files.fields),
    getJson<SeasonData['grid']>(manifest.files.precipGrid),
    getJson<SeasonData['ndvi']>(manifest.files.ndvi),
    getJson<SeasonData['precipDaily']>(manifest.files.precipDaily),
  ])
  return { manifest, fields, grid, ndvi, precipDaily }
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
// Rainfall
// ---------------------------------------------------------------------------

export interface RainfallTotals {
  /** Sample id -> inches accumulated from `rainZeroDate` through each day. */
  cumulative: Map<string, Float32Array>
  /** Sample id -> inches over the trailing 14 days ending on each day. */
  trailing14: Map<string, Float32Array>
  /** Sample id -> that day's rainfall in inches, for the detail chart. */
  daily: Map<string, Float32Array>
}

/** Sum the daily series into the two running totals the map draws.
 *
 * Both are computed for every calendar day even though the slider only visits
 * the 59 usable acquisition dates, because the field detail charts draw the
 * full daily season.
 */
export function buildRainfallTotals(data: SeasonData): RainfallTotals {
  const { manifest, precipDaily } = data
  const zeroDay = Math.max(0, manifest.days.indexOf(manifest.rainZeroDate))
  const nDays = manifest.days.length

  const cumulative = new Map<string, Float32Array>()
  const trailing14 = new Map<string, Float32Array>()
  const daily = new Map<string, Float32Array>()

  for (const [cellId, series] of Object.entries(precipDaily)) {
    const inchesPerDay = new Float32Array(nDays)
    const runningTotal = new Float32Array(nDays)
    const trailingTotal = new Float32Array(nDays)

    let total = 0
    for (let day = 0; day < nDays; day += 1) {
      const inches = (series[day] ?? 0) / MM_PER_INCH
      inchesPerDay[day] = inches
      if (day >= zeroDay) {
        total += inches
      }
      runningTotal[day] = total

      let trailing = 0
      for (let back = Math.max(0, day - TRAILING_DAYS + 1); back <= day; back += 1) {
        trailing += (series[back] ?? 0) / MM_PER_INCH
      }
      trailingTotal[day] = trailing
    }

    daily.set(cellId, inchesPerDay)
    cumulative.set(cellId, runningTotal)
    trailing14.set(cellId, trailingTotal)
  }

  return { cumulative, trailing14, daily }
}

// ---------------------------------------------------------------------------
// The rainfall raster
// ---------------------------------------------------------------------------

/** The lattice the rainfall sample points sit on, recovered from their centres.
 *
 * The export writes one square polygon per sample point — the area that sample
 * is taken to represent, not a native Daymet pixel. Drawn directly those
 * squares read as a checkerboard, so the explorer paints them into a small
 * image and lets MapLibre resample it. This works out the lattice indices
 * needed to do that.
 */
export interface RainfallRaster {
  width: number
  height: number
  /** Image corner coordinates, clockwise from top-left, for an image source. */
  coordinates: [[number, number], [number, number], [number, number], [number, number]]
  /** Sample ids in row-major order, north row first. Empty where absent. */
  cellIds: string[]
}

export function buildRainfallRaster(data: SeasonData): RainfallRaster {
  const [dLat, dLon] = data.manifest.sampleSpacingDeg
  const centres = data.grid.features.map((feature) => {
    const ring = feature.geometry.coordinates[0]
    return {
      id: feature.properties.id,
      lon: (ring[0][0] + ring[2][0]) / 2,
      lat: (ring[0][1] + ring[2][1]) / 2,
    }
  })

  const lons = centres.map((c) => c.lon)
  const lats = centres.map((c) => c.lat)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const width = Math.round((maxLon - minLon) / dLon) + 1
  const height = Math.round((maxLat - minLat) / dLat) + 1

  const cellIds = new Array<string>(width * height).fill('')
  for (const centre of centres) {
    const column = Math.round((centre.lon - minLon) / dLon)
    // Row 0 is the north edge, matching image row order.
    const row = Math.round((maxLat - centre.lat) / dLat)
    if (column >= 0 && column < width && row >= 0 && row < height) {
      cellIds[row * width + column] = centre.id
    }
  }

  // The image spans the outer edges of the edge samples, not their centres.
  const west = minLon - dLon / 2
  const east = maxLon + dLon / 2
  const south = minLat - dLat / 2
  const north = maxLat + dLat / 2

  return {
    width,
    height,
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
    cellIds,
  }
}

// ---------------------------------------------------------------------------
// Colour scales, fixed for the whole season
// ---------------------------------------------------------------------------

export interface ColourStop {
  value: number
  colour: string
}

/** Bare soil through closed canopy. Fixed so passes are comparable. */
export const NDVI_STOPS: ColourStop[] = [
  { value: 0.1, colour: '#ddcfa8' },
  { value: 0.25, colour: '#cbcc84' },
  { value: 0.4, colour: '#a9c064' },
  { value: 0.55, colour: '#7ba94e' },
  { value: 0.7, colour: '#4e8b3c' },
  { value: 0.85, colour: '#2c6a30' },
  { value: 0.95, colour: '#164a24' },
]

/** Season accumulation. The top of the scale is the wettest sample's season. */
export const CUMULATIVE_STOPS: ColourStop[] = [
  { value: 0, colour: '#f7fcff' },
  { value: 6, colour: '#dceaf7' },
  { value: 12, colour: '#b6d4ec' },
  { value: 18, colour: '#84b4dc' },
  { value: 24, colour: '#4e8dc4' },
  { value: 30, colour: '#2a639f' },
  { value: 36, colour: '#153d70' },
]

/** Recent wet or dry. Tops out just above the wettest fortnight in this season. */
export const TRAILING_STOPS: ColourStop[] = [
  { value: 0, colour: '#fbf7ea' },
  { value: 2, colour: '#cfe4f5' },
  { value: 4, colour: '#8fc0e2' },
  { value: 6, colour: '#4f93c8' },
  { value: 8, colour: '#26639f' },
  { value: 10, colour: '#123567' },
]

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Linear interpolation through a stop list, clamped at both ends. */
export function sampleStops(stops: ColourStop[], value: number): [number, number, number] {
  if (!Number.isFinite(value) || value <= stops[0].value) {
    return parseHex(stops[0].colour)
  }
  const last = stops[stops.length - 1]
  if (value >= last.value) {
    return parseHex(last.colour)
  }
  for (let i = 1; i < stops.length; i += 1) {
    if (value <= stops[i].value) {
      const lower = stops[i - 1]
      const upper = stops[i]
      const t = (value - lower.value) / (upper.value - lower.value)
      const a = parseHex(lower.colour)
      const b = parseHex(upper.colour)
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ]
    }
  }
  return parseHex(last.colour)
}

export function stopsToCss(stops: ColourStop[]): string {
  const span = stops[stops.length - 1].value - stops[0].value
  const parts = stops.map((stop) => {
    const pct = ((stop.value - stops[0].value) / span) * 100
    return `${stop.colour} ${pct.toFixed(1)}%`
  })
  return `linear-gradient(to right, ${parts.join(', ')})`
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

export type { FieldProperties, GridCellProperties }
