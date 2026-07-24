// Data contracts shared by the Iowa Severe Weather Data Explorer.
// These mirror the shapes emitted by the offline Python pipeline (mocked in Phase 1).

export type ImageCoordinates = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
]

export type HrrrVariable =
  | 'composite_reflectivity'
  | 'wind_gust'
  | 'wind_speed_10m'
  | 'temperature_2m'
  | 'dewpoint_2m'
  | 'mucape'

export type PrimaryWeatherLayer = 'radar' | 'satellite' | 'hrrr'

export type StationOverlay = 'none' | 'temperature' | 'dewpoint' | 'wind' | 'gust'

export type SatelliteProduct = 'sandwich' | 'visible' | 'infrared'

export type RadarProduct = 'reflectivity' | 'velocity'

export interface RasterFrameReference {
  url: string
  validTimeUtc: string
  sourceTimeUtc: string | null
  coordinates: ImageCoordinates
  available: boolean
  statusMessage?: string
  // Frames may carry alternate product rasters (satellite: sandwich/visible/
  // infrared; radar: reflectivity/velocity) keyed by product name.
  products?: Partial<Record<string, string>>
  // Radar frames: actual KDMX Level II scan time backing the velocity product.
  velocitySourceTimeUtc?: string
}

export interface HrrrFrameSet {
  cycleTimeUtc: string
  forecastHour: number
  variables: Partial<Record<HrrrVariable, RasterFrameReference>>
}

export interface TimelineFrame {
  index: number
  validTimeUtc: string
  displayTimeCentral: string
  radar: RasterFrameReference | null
  satellite: RasterFrameReference | null
  hrrr: HrrrFrameSet | null
}

export interface EventManifest {
  event: {
    id: string
    title: string
    startTimeUtc: string
    endTimeUtc: string
    timezone: 'America/Chicago'
  }

  map: {
    viewBounds: [[number, number], [number, number]]
    maxBounds: [[number, number], [number, number]]
    maximumZoom: number
  }

  files: {
    timeline: string
    reports: string
    warnings: string
    stations: string
    stationsSeries?: string
    assessments: string
    iowa?: string
  }
}

export interface ExplorerDisplayState {
  primaryLayer: PrimaryWeatherLayer
  radarProduct: RadarProduct
  satelliteUnderRadar: boolean
  satelliteProduct: SatelliteProduct
  stationOverlay: StationOverlay
  hrrrVariable: HrrrVariable
  showReports: boolean
  showWarnings: boolean
  showPostEventAssessments: boolean
}
