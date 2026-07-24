import type { Map } from 'maplibre-gl'
import type {
  HrrrVariable,
  ImageCoordinates,
  RadarProduct,
  SatelliteProduct,
  TimelineFrame,
} from './mapTypes'
import { applyTimelineFilters } from './mapFilters'
import { updateRasterSource } from './mapLayers'
import { assetUrl } from './assetUrl'

const FALLBACK_COORDINATES: ImageCoordinates = [
  [-97, 44],
  [-89, 44],
  [-89, 40],
  [-97, 40],
]

interface UpdateFrameOptions {
  map: Map
  frame: TimelineFrame
  hrrrVariable: HrrrVariable
  radarProduct: RadarProduct
  satelliteProduct: SatelliteProduct
  transparentImageUrl: string
}

// Resolve the raster URL for the selected satellite product, falling back to the
// frame's default satellite url when the product is unavailable.
function satelliteUrl(frame: TimelineFrame, product: SatelliteProduct): string | null {
  const sat = frame.satellite
  if (!sat?.available) return null
  const rel = sat.products?.[product] ?? sat.url
  return assetUrl(rel)
}

// Resolve the radar raster URL for the selected product. Velocity is only shown
// when the frame actually carries a velocity raster — no silent substitution.
export function radarUrl(frame: TimelineFrame, product: RadarProduct): string | null {
  const radar = frame.radar
  if (!radar?.available) return null
  if (product === 'reflectivity') {
    return assetUrl(radar.products?.reflectivity ?? radar.url)
  }
  const velocity = radar.products?.velocity
  return velocity ? assetUrl(velocity) : null
}

// Point every raster source at the correct image for this frame, then apply the
// time-based feature filters. Missing rasters fall back to the transparent image
// rather than silently carrying a stale frame forward.
export function updateMapForFrame({
  map,
  frame,
  hrrrVariable,
  radarProduct,
  satelliteProduct,
  transparentImageUrl,
}: UpdateFrameOptions): void {
  const radar = radarUrl(frame, radarProduct)
  if (radar && frame.radar) {
    updateRasterSource(map, 'radar-source', radar, frame.radar.coordinates)
  } else {
    updateRasterSource(
      map,
      'radar-source',
      transparentImageUrl,
      frame.radar?.coordinates ?? FALLBACK_COORDINATES,
    )
  }

  const satUrl = satelliteUrl(frame, satelliteProduct)
  if (satUrl && frame.satellite) {
    updateRasterSource(map, 'satellite-source', satUrl, frame.satellite.coordinates)
  } else {
    updateRasterSource(
      map,
      'satellite-source',
      transparentImageUrl,
      frame.satellite?.coordinates ?? FALLBACK_COORDINATES,
    )
  }

  const hrrrFrame = frame.hrrr?.variables[hrrrVariable]

  if (hrrrFrame?.available) {
    updateRasterSource(map, 'hrrr-source', assetUrl(hrrrFrame.url), hrrrFrame.coordinates)
  } else {
    updateRasterSource(map, 'hrrr-source', transparentImageUrl, FALLBACK_COORDINATES)
  }

  applyTimelineFilters(map, frame.index, frame.validTimeUtc)
}
