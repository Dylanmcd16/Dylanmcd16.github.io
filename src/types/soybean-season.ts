/** Data contract for the Iowa Soybean Season Explorer.
 *
 * Mirrors what `scripts/iowa11_portfolio_export.py` writes in the
 * soybean-canopy-intelligence repository. Two conventions run through all of
 * it and are worth stating once:
 *
 * - A "day" is an index into `Manifest.days`, which is every calendar day of
 *   the season. A "pass" is an index into `Manifest.ndviDays`, which holds
 *   only the days a clear Sentinel-2 acquisition exists for. The slider steps
 *   through passes; rainfall is summed over days.
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
  nPasses: number
  nObservations: number
  nGridCells: number
  /** Every calendar day of the season, ISO, ascending. */
  days: string[]
  /** Indices into `days` that have a clear Sentinel-2 pass. */
  ndviDays: number[]
  /** The day cumulative rainfall is counted from. Not a planting date. */
  rainZeroDate: string
  minSoybeanFraction: number
  inwardBufferM: number
  /** [latitude, longitude] size of one Daymet cell, in degrees. */
  gridCellDeg: [number, number]
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
  /** Key into the precipitation series of the nearest Daymet cell. */
  cell: string
  lon: number
  lat: number
  /** Number of clear passes this field was observed on. */
  n: number
}

export interface GridCellProperties {
  id: string
}

/** One field's NDVI: `d` are day indices, `v` the matching values. */
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
  /** Cell id -> daily precipitation in millimetres, one per calendar day. */
  precipDaily: Record<string, number[]>
}
