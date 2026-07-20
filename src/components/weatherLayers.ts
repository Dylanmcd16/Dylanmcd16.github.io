const GIBS_WMS_URL =
  'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi'

const PRECIP_LAYER_CANDIDATES = [
  'IMERG_Rain_Rate',
  'IMERG_Precipitation_Rate',
]

export type PrecipLayerInfo = {
  layerName: string
  timestampUTC: string
}

export type WeatherLayerInfo = {
  precip?: PrecipLayerInfo
  caption: string
}

export type GeographicBbox = {
  west: number
  south: number
  east: number
  north: number
}

export type PrecipGetMapOptions = {
  width?: number
  height?: number
  bbox?: GeographicBbox
}

function normalizeUtc(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00Z`
  }
  return trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`
}

function latestFromTimeDimension(value: string): string {
  const chunks = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    const rangeParts = chunks[i].split('/')
    const candidate = rangeParts.length >= 2 ? rangeParts[1] : rangeParts[0]
    const normalized = normalizeUtc(candidate)
    if (normalized) return normalized
  }

  return ''
}

function findLayer(doc: Document, layerName: string): Element | null {
  const layers = Array.from(doc.getElementsByTagName('Layer'))
  return (
    layers.find((layer) => {
      const name = Array.from(layer.children).find(
        (child) => child.localName === 'Name',
      )
      return name?.textContent?.trim() === layerName
    }) ?? null
  )
}

function readTimeDimension(layer: Element): string {
  const dimensions = Array.from(layer.children).filter(
    (child) => child.localName === 'Dimension',
  )
  const timeDimension = dimensions.find(
    (dimension) => dimension.getAttribute('name') === 'time',
  )
  if (!timeDimension) return ''

  const defaultTime = timeDimension.getAttribute('default')
  return (
    normalizeUtc(defaultTime || '') ||
    latestFromTimeDimension(timeDimension.textContent || '')
  )
}

async function fetchGibsCapabilities(
  signal?: AbortSignal,
): Promise<Document | null> {
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetCapabilities',
  })

  const response = await fetch(`${GIBS_WMS_URL}?${params.toString()}`, {
    signal,
  })
  if (!response.ok) return null

  const text = await response.text()
  return new DOMParser().parseFromString(text, 'application/xml')
}

function resolveFirstTimedLayer(
  doc: Document,
  candidates: string[],
): { layerName: string; timestampUTC: string } | null {
  for (const candidate of candidates) {
    const layer = findLayer(doc, candidate)
    if (!layer) continue

    const timestampUTC = readTimeDimension(layer)
    if (!timestampUTC) continue

    return {
      layerName:
        layer.querySelector('Name')?.textContent?.trim() || candidate,
      timestampUTC,
    }
  }

  return null
}

export async function fetchLatestGibsWeatherLayers(
  signal?: AbortSignal,
): Promise<{ precip?: PrecipLayerInfo }> {
  const doc = await fetchGibsCapabilities(signal)
  if (!doc) return {}

  return {
    precip: resolveFirstTimedLayer(doc, PRECIP_LAYER_CANDIDATES) ?? undefined,
  }
}

export function buildPrecipImageryProvider(
  Cesium: any,
  layerInfo: PrecipLayerInfo,
): any {
  return new Cesium.WebMapServiceImageryProvider({
    url: GIBS_WMS_URL,
    layers: layerInfo.layerName,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    parameters: {
      service: 'WMS',
      version: '1.3.0',
      transparent: true,
      format: 'image/png',
      time: layerInfo.timestampUTC,
    },
    credit: 'NASA GIBS / GPM IMERG',
  })
}

/** Convert longitude to the X coordinate used by EPSG:3857 Web Mercator. */
function longitudeToWebMercatorX(longitude: number): number {
  return (longitude * 20037508.342789244) / 180
}

/** Convert latitude to EPSG:3857 while avoiding the projection's poles. */
function latitudeToWebMercatorY(latitude: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude))
  const radians = (clamped * Math.PI) / 180
  return 6378137 * Math.log(Math.tan(Math.PI / 4 + radians / 2))
}

/**
 * Build a normal transparent WMS image URL from the same IMERG layer used by
 * Cesium. This lets non-Cesium page elements display the real data as an <img>
 * while keeping all layer and timestamp discovery in one module.
 */
export function buildPrecipGetMapUrl(
  layerInfo: PrecipLayerInfo,
  options: PrecipGetMapOptions = {},
): string {
  const width = Math.round(options.width ?? 1600)
  const height = Math.round(options.height ?? 720)
  const bbox = options.bbox ?? {
    west: -180,
    south: -60,
    east: 180,
    north: 80,
  }

  const minX = longitudeToWebMercatorX(bbox.west)
  const minY = latitudeToWebMercatorY(bbox.south)
  const maxX = longitudeToWebMercatorX(bbox.east)
  const maxY = latitudeToWebMercatorY(bbox.north)

  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: layerInfo.layerName,
    styles: '',
    format: 'image/png',
    transparent: 'true',
    time: layerInfo.timestampUTC,
    crs: 'EPSG:3857',
    bbox: `${minX},${minY},${maxX},${maxY}`,
    width: String(Math.max(1, Math.min(4096, width))),
    height: String(Math.max(1, Math.min(4096, height))),
  })

  return `${GIBS_WMS_URL}?${params.toString()}`
}

function formatTimestamp(timestampUTC: string): string {
  return timestampUTC.replace('T', ' ').replace(/(?:\.\d+)?Z$/, ' UTC')
}

export function buildWeatherLayerCaption(
  layerInfo: Partial<WeatherLayerInfo>,
): string {
  if (layerInfo.precip?.timestampUTC) {
    return `Latest available: NASA GPM IMERG global precipitation estimate - ${formatTimestamp(
      layerInfo.precip.timestampUTC,
    )}`
  }

  return DEFAULT_WEATHER_LAYER_CAPTION
}

export const DEFAULT_WEATHER_LAYER_CAPTION =
  'Latest available: NASA GPM IMERG global precipitation overlay'