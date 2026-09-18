/** Data contract for the Iowa Soybean Season Explorer.
 *
 * Mirrors what `scripts/iowa11_portfolio_export.py` writes in the
 * soybean-canopy-intelligence repository. Three conventions run through all of
 * it and are worth stating once:
 *
 * - A "day" is an index into `Manifest.days`, which is every calendar day of
 *   the season. A "date" in `Manifest.ndviDays` is a *usable* Sentinel-2
 *   acquisition: one where at least one field could be measured. It does not
 *   mean every field was visible — on most usable dates some are still lost to
 *   cloud, which is why 9,769 valid observations come out of 248 x 59 = 14,632
 *   possible field-date pairs. The slider steps through usable dates; rainfall
 *   is summed over calendar days.
 * - Rainfall sample points sit on a regular latitude/longitude lattice at
 *   roughly 1 km spacing. They are NOT Daymet's native projected 1 km pixels,
 *   so nothing here should be called a "Daymet cell".
 * - Distances and depths are metric on the wire. Rainfall is converted to
 *   inches at the point of display, not in the data.
 */

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
  /** nFields x nPasses: what would exist with no cloud at all. */
  nPossibleObservations: number
  nSamplePoints: number
  /** Every calendar day of the season, ISO, ascending. */
  days: string[]
  /** Indices into `days` with a usable Sentinel-2 acquisition. */
  ndviDays: number[]
  /** The day cumulative rainfall is counted from. Not a planting date. */
  rainZeroDate: string
  minSoybeanFraction: number
  inwardBufferM: number
  /** [latitude, longitude] spacing of the rainfall sample points, in degrees. */
  sampleSpacingDeg: [number, number]
  files: {
    fields: string
    ndvi: string
    precipGrid: string
    precipDaily: string
  }
  sources: Record<string, string>
  notes: Record<string, string>
}

export interface FieldProperties {
  id: number
  ha: number | null
  acres: number | null
  soil: string | null
  /** Key into the precipitation series of the nearest rainfall sample point. */
  cell: string
  lon: number
  lat: number
  /** Usable dates this field was actually measured on, out of nPasses. */
  n: number
}

export interface GridCellProperties {
  id: string
}

/** One field's NDVI: `d` are day indices, `v` the matching values. A date
 * missing from `d` means the field was clouded out on it. */
export interface NdviSeries {
  d: number[]
  v: (number | null)[]
}

export type PrecipLayer = 'none' | 'cumulative' | 'trailing14'

export interface SeasonData {
  manifest: SeasonManifest
  fields: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, FieldProperties>
  grid: GeoJSON.FeatureCollection<GeoJSON.Polygon, GridCellProperties>
  /** Field id as a string -> its sparse NDVI series. */
  ndvi: Record<string, NdviSeries>
  /** Sample-point id -> daily precipitation in millimetres, per calendar day. */
  precipDaily: Record<string, number[]>
}
