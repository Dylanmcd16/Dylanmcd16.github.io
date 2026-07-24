import type { FeatureCollection, Geometry } from 'geojson'
import type {
  DataDrivenPropertyValueSpecification,
  GeoJSONSource,
  ImageSource,
  Map,
} from 'maplibre-gl'
import type { ImageCoordinates } from './mapTypes'

const EMPTY_COLLECTION: FeatureCollection<Geometry> = {
  type: 'FeatureCollection',
  features: [],
}

// A neutral placeholder footprint used before the first real frame loads.
const PLACEHOLDER_COORDINATES: ImageCoordinates = [
  [-97, 44],
  [-89, 44],
  [-89, 40],
  [-97, 40],
]

export function addWeatherSources(
  map: Map,
  transparentImageUrl: string,
  coordinates: ImageCoordinates = PLACEHOLDER_COORDINATES,
): void {
  map.addSource('satellite-source', {
    type: 'image',
    url: transparentImageUrl,
    coordinates,
  })

  map.addSource('hrrr-source', {
    type: 'image',
    url: transparentImageUrl,
    coordinates,
  })

  map.addSource('radar-source', {
    type: 'image',
    url: transparentImageUrl,
    coordinates,
  })

  map.addSource('reports-source', {
    type: 'geojson',
    data: EMPTY_COLLECTION,
    promoteId: 'report_id',
  })

  map.addSource('warnings-source', {
    type: 'geojson',
    data: EMPTY_COLLECTION,
    promoteId: 'warning_id',
  })

  map.addSource('stations-source', {
    type: 'geojson',
    data: EMPTY_COLLECTION,
    promoteId: 'observation_id',
  })

  map.addSource('assessments-source', {
    type: 'geojson',
    data: EMPTY_COLLECTION,
    promoteId: 'assessment_id',
  })
}

export function addWeatherLayers(map: Map): void {
  map.addLayer({
    id: 'satellite-layer',
    type: 'raster',
    source: 'satellite-source',
    layout: { visibility: 'none' },
    paint: {
      'raster-opacity': 0.7,
      'raster-fade-duration': 0,
    },
  })

  map.addLayer({
    id: 'hrrr-layer',
    type: 'raster',
    source: 'hrrr-source',
    layout: { visibility: 'none' },
    paint: {
      'raster-opacity': 0.72,
      'raster-fade-duration': 0,
    },
  })

  map.addLayer({
    id: 'radar-layer',
    type: 'raster',
    source: 'radar-source',
    layout: { visibility: 'visible' },
    paint: {
      'raster-opacity': 0.82,
      'raster-fade-duration': 0,
    },
  })

  map.addLayer({
    id: 'warning-fill',
    type: 'fill',
    source: 'warnings-source',
    paint: {
      'fill-color': ['match', ['get', 'phenomena'], 'TO', '#ef4444', 'SV', '#f59e0b', '#f97316'],
      'fill-opacity': 0.12,
    },
  })

  map.addLayer({
    id: 'warning-outline',
    type: 'line',
    source: 'warnings-source',
    paint: {
      'line-color': ['match', ['get', 'phenomena'], 'TO', '#ef4444', 'SV', '#f59e0b', '#f97316'],
      'line-width': 2,
    },
  })

  // Damage severity ramp (estimated mph from the NWS survey products).
  const damageWindColor: DataDrivenPropertyValueSpecification<string> = [
    'case',
    ['!', ['has', 'windspeed_mph']],
    '#9ca3af',
    [
      'step',
      ['to-number', ['get', 'windspeed_mph']],
      '#facc15', // < 70 mph
      70,
      '#f97316', // 70–89
      90,
      '#dc2626', // 90–109
      110,
      '#7e22ce', // 110+
    ],
  ] as DataDrivenPropertyValueSpecification<string>

  map.addLayer({
    id: 'assessment-fill',
    type: 'fill',
    source: 'assessments-source',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': damageWindColor,
      'fill-opacity': 0.28,
    },
  })

  map.addLayer({
    id: 'assessment-outline',
    type: 'line',
    source: 'assessments-source',
    filter: ['==', ['geometry-type'], 'Polygon'],
    layout: { visibility: 'none' },
    paint: {
      'line-color': damageWindColor,
      'line-width': 2,
      'line-dasharray': [2, 1.5],
    },
  })

  // Surveyed damage / tornado track lines (NWS DAT), drawn solid and thicker.
  map.addLayer({
    id: 'assessment-tracks',
    type: 'line',
    source: 'assessments-source',
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: { visibility: 'none', 'line-cap': 'round' },
    paint: {
      'line-color': '#dc2626',
      'line-width': 4,
      'line-opacity': 0.9,
    },
  })

  // Tornado report points within the assessments source (post-event).
  map.addLayer({
    id: 'assessment-points',
    type: 'circle',
    source: 'assessments-source',
    filter: ['==', ['geometry-type'], 'Point'],
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': 6,
      'circle-color': damageWindColor,
      'circle-stroke-color': '#1f2937',
      'circle-stroke-width': 1.5,
    },
  })

  map.addLayer({
    id: 'new-report-pulse',
    type: 'circle',
    source: 'reports-source',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 11, 10, 18],
      'circle-color': 'rgba(255,255,255,0)',
      'circle-stroke-color': '#0f172a',
      'circle-stroke-width': 2.5,
      'circle-opacity': 0.7,
    },
  })

  map.addLayer({
    id: 'storm-reports',
    type: 'circle',
    source: 'reports-source',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 5, 10, 9],
      'circle-color': [
        'match',
        ['get', 'event_type'],
        'tornado',
        '#dc2626',
        'hail',
        '#16a34a',
        'measured_wind',
        '#2f5fd0',
        'wind_damage',
        '#f97316',
        '#7c3aed',
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['case', ['==', ['get', 'delayed_report'], true], 2.5, 1.2],
      'circle-opacity': 0.95,
    },
  })

  map.addLayer({
    id: 'station-points',
    type: 'circle',
    source: 'stations-source',
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 10, 10],
      'circle-color': '#ffffff',
      'circle-stroke-color': '#0f172a',
      'circle-stroke-width': 1.5,
    },
  })

  map.addLayer({
    id: 'station-labels',
    type: 'symbol',
    source: 'stations-source',
    layout: {
      visibility: 'none',
      'text-field': ['get', 'temp_label'],
      'text-size': 12,
      'text-offset': [0, 1.35],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#0f172a',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.6,
    },
  })
}

// Draw the Iowa state boundary above the weather rasters but beneath the
// vector features, so the clipped domain reads as the state itself.
export function addIowaBoundary(map: Map, url: string): void {
  map.addSource('iowa-source', { type: 'geojson', data: url })
  map.addLayer(
    {
      id: 'iowa-boundary',
      type: 'line',
      source: 'iowa-source',
      // Light stroke so the state outline reads against satellite imagery.
      paint: {
        'line-color': '#f8fafc',
        'line-width': 2,
        'line-opacity': 0.9,
      },
    },
    map.getLayer('warning-fill') ? 'warning-fill' : undefined,
  )
}

export function updateRasterSource(
  map: Map,
  sourceId: string,
  url: string,
  coordinates: ImageCoordinates,
): void {
  const source = map.getSource(sourceId)

  if (!source || source.type !== 'image') {
    return
  }

  ;(source as ImageSource).updateImage({ url, coordinates })
}

export async function loadVectorSource(
  map: Map,
  sourceId: string,
  url: string,
): Promise<void> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load ${sourceId}: ${response.status}`)
  }

  const data = (await response.json()) as FeatureCollection<Geometry>
  const source = map.getSource(sourceId)

  if (!source || source.type !== 'geojson') {
    throw new Error(`GeoJSON source ${sourceId} is unavailable`)
  }

  ;(source as GeoJSONSource).setData(data)
}
