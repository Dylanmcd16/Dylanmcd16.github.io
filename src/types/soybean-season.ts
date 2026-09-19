/** Data contract for the Iowa Soybean Season Explorer.
 *
 * Mirrors what `iowa11_portfolio_export.py` and `mrms02_qc_and_export.py`
 * write in the soybean-canopy-intelligence repository. Three conventions run
 * through all of it and are worth stating once:
 *
 * - A "day" is an index into `SeasonManifest.days`, which is every calendar day
 *   of the season. A "date" in `ndviDays` is a *usable* Sentinel-2 acquisition:
 *   one where at least one field could be measured. It does not mean every
 *   field was visible — on most usable dates some are still lost to cloud,
 *   which is why 9,769 valid observations come out of 248 × 59 = 14,632
 *   possible field-date pairs.
 * - Rainfall is MRMS on its own native ~1 km grid, accumulated from hourly QPE
 *   into local Central Time calendar days. It is not resampled and not
 *   interpolated; the smoothing in the display is rendering only.
 * - Depths are millimetres on the wire and converted to inches at the point of
 *   display, because the source is metric.
 */

export interface RainManifest {
  source: string
  product: string
  grid: string
  temporalResolution: string
  timezone: string
  units: string
  /** Native MRMS cells in the exported window. */
  nRows: number
  nCols: number
  /** [west, south, east, north] of the window's outer cell edges, WGS84. */
  bounds: [number, number, number, number]
  /** Millimetres per quantisation level, per window. */
  cumulativeStepMm: number
  trailingStepMm: number
  cumulativeMaxMm: number
  trailingMaxMm: number
  /** Byte value meaning "no MRMS data here". */
  noDataValue: number
  missingHourPct: number
  gridFile: string
  fieldFile: string
  /** Order of the planes inside the grid binary. */
  planeOrder: ['cumulative', 'trailing14']
  note: string
}

export interface SeasonManifest {
  title: string
  studyArea: string
  season: number
  start: string
  end: string
  /** [west, south, east, north] of the field polygons, WGS84. */
  bounds: [number, number, number, number]
  nFields: number
  nDays: number
  /** Count of usable Sentinel-2 acquisition dates. */
  nPasses: number
  /** Valid field-level NDVI observations. */
  nObservations: number
  /** nFields × nPasses: what would exist with no cloud at all. */
  nPossibleObservations: number
  /** Every calendar day of the season, ISO, ascending. */
  days: string[]
  /** Indices into `days` with a usable Sentinel-2 acquisition. */
  ndviDays: number[]
  /** The day cumulative rainfall is counted from. Not a planting date. */
  rainZeroDate: string
  minSoybeanFraction: number
  inwardBufferM: number
  files: Record<string, string>
  sources: Record<string, string>
  notes: Record<string, string>
  rain: RainManifest
}

export interface FieldProperties {
  id: number
  ha: number | null
  acres: number | null
  soil: string | null
  lon: number
  lat: number
  /** Usable dates this field was actually measured on, out of nPasses. */
  n: number
}

/** One field's NDVI: `d` are day indices, `v` the matching values. A date
 * missing from `d` means the field was clouded out on it. */
export interface NdviSeries {
  d: number[]
  v: (number | null)[]
}

/** Per-field daily MRMS means, on their own calendar that starts before the
 * season so the earliest trailing-14-day window is complete. */
export interface RainFields {
  days: string[]
  /** Index into `days` of 1 May. */
  rainZeroIndex: number
  /** Index into `days` of the season's first day. */
  seasonStartIndex: number
  /** Field id as a string -> daily millimetres, null where MRMS had no data. */
  mm: Record<string, (number | null)[]>
}

export type PrecipLayer = 'none' | 'cumulative' | 'trailing14'

export interface SeasonData {
  manifest: SeasonManifest
  fields: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, FieldProperties>
  /** Field id as a string -> its sparse NDVI series. */
  ndvi: Record<string, NdviSeries>
  /** Quantised MRMS grids: [cumulative planes, then trailing planes]. */
  rainGrids: Uint8Array
  rainFields: RainFields
}
