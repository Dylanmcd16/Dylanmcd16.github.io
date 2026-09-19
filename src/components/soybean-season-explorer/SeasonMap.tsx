import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  type ImageSource,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FieldProperties, PrecipLayer, SeasonData } from '../../types/soybean-season'
import {
  CUMULATIVE_STOPS,
  TRAILING_STOPS,
  buildRainfallRaster,
  featureBounds,
  ndviColourExpression,
  sampleStops,
  type NdviLookup,
  type RainfallRaster,
  type RainfallTotals,
} from '../../lib/soybean-season/season'

/** Satellite imagery, with place labels drawn over it.
 *
 * Esri World Imagery and CARTO's label-only tiles both serve without an API
 * key, which keeps the deployed page free of a client-side token. The labels
 * sit above the rainfall raster but below the fields, so towns and roads stay
 * readable without covering the crop.
 */
const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'esri-imagery', type: 'raster', source: 'esri-imagery' }],
}

const LABELS_SOURCE = 'carto-labels'
const FIELDS_SOURCE = 'soybean-fields'
const RAIN_SOURCE = 'rainfall-raster'
const EXTENT_SOURCE = 'study-extent'
const MASK_SOURCE = 'study-mask'

const LAYER_RAIN = 'rainfall-fill'
const LAYER_MASK = 'study-mask-fill'
const LAYER_EXTENT = 'study-extent-line'
const LAYER_LABELS = 'carto-labels-raster'
const LAYER_FIELD_FILL = 'field-fill'
const LAYER_FIELD_LINE = 'field-line'
const LAYER_FIELD_SELECTED = 'field-selected'

/** A one-byte-per-channel image of the rainfall grid, redrawn each step.
 *
 * The values are the Daymet samples unchanged — one image pixel per sample
 * point, roughly 1 km apart. Only the *rendering* is smoothed: MapLibre
 * resamples the image linearly, which turns the lattice into a gradient
 * instead of a checkerboard. Positions with no sample stay fully transparent
 * rather than being filled in.
 */
function paintRainfall(
  canvas: HTMLCanvasElement,
  raster: RainfallRaster,
  totals: Map<string, Float32Array>,
  day: number,
  layer: Exclude<PrecipLayer, 'none'>,
): string {
  const context = canvas.getContext('2d')
  if (!context) {
    return ''
  }
  const stops = layer === 'cumulative' ? CUMULATIVE_STOPS : TRAILING_STOPS
  const image = context.createImageData(raster.width, raster.height)

  for (let i = 0; i < raster.cellIds.length; i += 1) {
    const cellId = raster.cellIds[i]
    const offset = i * 4
    if (!cellId) {
      image.data[offset + 3] = 0
      continue
    }
    const series = totals.get(cellId)
    const value = series ? series[day] : Number.NaN
    if (!Number.isFinite(value)) {
      image.data[offset + 3] = 0
      continue
    }
    const [r, g, b] = sampleStops(stops, value)
    image.data[offset] = r
    image.data[offset + 1] = g
    image.data[offset + 2] = b
    image.data[offset + 3] = 255
  }

  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

interface SeasonMapProps {
  data: SeasonData
  ndvi: NdviLookup
  rainfall: RainfallTotals
  /** Calendar day index of the pass being shown. */
  day: number
  precipLayer: PrecipLayer
  showFields: boolean
  selectedFieldId: number | null
  onSelectField: (fieldId: number | null) => void
  onReady: () => void
}

export function SeasonMap({
  data,
  ndvi,
  rainfall,
  day,
  precipLayer,
  showFields,
  selectedFieldId,
  onSelectField,
  onReady,
}: SeasonMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // State rather than a ref on purpose. The effects below mount before the
  // style has loaded, so they need a dependency that changes when it does --
  // a ref would flip silently and leave the map unpainted.
  const [styleReady, setStyleReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rasterRef = useRef<RainfallRaster | null>(null)
  const selectRef = useRef(onSelectField)
  selectRef.current = onSelectField

  // ---- build the map once -------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const raster = buildRainfallRaster(data)
    rasterRef.current = raster
    const canvas = document.createElement('canvas')
    canvas.width = raster.width
    canvas.height = raster.height
    canvasRef.current = canvas

    const [west, south, east, north] = data.manifest.bounds
    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      bounds: [
        [west, south],
        [east, north],
      ],
      fitBoundsOptions: { padding: 12 },
      maxBounds: [
        [west - 0.35, south - 0.3],
        [east + 0.35, north + 0.3],
      ],
      maxZoom: 16,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new ScaleControl({ unit: 'imperial' }), 'bottom-left')

    map.on('load', () => {
      // Rainfall first, so labels and fields both draw over it.
      map.addSource(RAIN_SOURCE, {
        type: 'image',
        url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        coordinates: raster.coordinates,
      })
      map.addLayer({
        id: LAYER_RAIN,
        type: 'raster',
        source: RAIN_SOURCE,
        paint: {
          // Light enough that the imagery stays readable underneath. The
          // rainfall is context for the crop, not the subject of the map.
          'raster-opacity': 0.38,
          // Linear resampling is what turns the ~1 km lattice into a smooth
          // field. The numbers behind it are still the individual samples.
          'raster-resampling': 'linear',
          'raster-fade-duration': 0,
        },
        layout: { visibility: 'none' },
      })

      // The overlay stops at the edge of the sampled area, which is a hard
      // rectangle. Outlining it makes that edge read as the boundary of the
      // data rather than as a rendering artefact.
      const [[west2, north2], [east2], , [, south2]] = raster.coordinates
      map.addSource(MASK_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            // A polygon covering the world with the study area cut out of it.
            type: 'Polygon',
            coordinates: [
              [
                [-180, -85],
                [180, -85],
                [180, 85],
                [-180, 85],
                [-180, -85],
              ],
              [
                [raster.coordinates[3][0], raster.coordinates[3][1]],
                [raster.coordinates[2][0], raster.coordinates[2][1]],
                [raster.coordinates[1][0], raster.coordinates[1][1]],
                [raster.coordinates[0][0], raster.coordinates[0][1]],
                [raster.coordinates[3][0], raster.coordinates[3][1]],
              ],
            ],
          },
        },
      })
      map.addLayer({
        id: LAYER_MASK,
        type: 'fill',
        source: MASK_SOURCE,
        paint: {
          'fill-color': '#0b1522',
          'fill-opacity': 0.46,
        },
      })

      map.addSource(EXTENT_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [west2, north2],
              [east2, north2],
              [east2, south2],
              [west2, south2],
              [west2, north2],
            ],
          },
        },
      })
      map.addLayer({
        id: LAYER_EXTENT,
        type: 'line',
        source: EXTENT_SOURCE,
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.5)',
          'line-width': 1,
          'line-dasharray': [3, 3],
        },
      })

      map.addSource(LABELS_SOURCE, {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
      })
      map.addLayer({
        id: LAYER_LABELS,
        type: 'raster',
        source: LABELS_SOURCE,
        paint: { 'raster-opacity': 0.85 },
      })

      map.addSource(FIELDS_SOURCE, { type: 'geojson', data: data.fields, promoteId: 'id' })

      map.addLayer({
        id: LAYER_FIELD_FILL,
        type: 'fill',
        source: FIELDS_SOURCE,
        paint: {
          'fill-color': ndviColourExpression() as never,
          // A field with no clear view on this pass is left hollow rather than
          // carrying its previous colour forward.
          'fill-opacity': [
            'case',
            ['<', ['coalesce', ['feature-state', 'ndvi'], -1], 0],
            0,
            0.88,
          ] as never,
        },
      })

      map.addLayer({
        id: LAYER_FIELD_LINE,
        type: 'line',
        source: FIELDS_SOURCE,
        paint: {
          'line-color': [
            'case',
            ['<', ['coalesce', ['feature-state', 'ndvi'], -1], 0],
            'rgba(248, 250, 252, 0.95)',
            'rgba(255, 255, 255, 0.7)',
          ] as never,
          // A clouded-out field is drawn as a brighter, heavier outline with no
          // fill, so it reads as "no observation" rather than as a dark field.
          // MapLibre's line-dasharray is not data-driven, so the distinction is
          // carried by colour and weight instead of by a dashed stroke.
          'line-width': [
            'case',
            ['<', ['coalesce', ['feature-state', 'ndvi'], -1], 0],
            1.5,
            0.8,
          ] as never,
        },
      })

      map.addLayer({
        id: LAYER_FIELD_SELECTED,
        type: 'line',
        source: FIELDS_SOURCE,
        paint: {
          'line-color': '#facc15',
          'line-width': 2.6,
        },
        filter: ['==', ['get', 'id'], -1],
      })

      const pick = (event: MapMouseEvent) => {
        const hit = map.queryRenderedFeatures(event.point, { layers: [LAYER_FIELD_FILL] })
        const properties = hit[0]?.properties as FieldProperties | undefined
        selectRef.current(properties ? Number(properties.id) : null)
      }
      map.on('click', pick)
      map.on('mouseenter', LAYER_FIELD_FILL, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', LAYER_FIELD_FILL, () => {
        map.getCanvas().style.cursor = ''
      })

      setStyleReady(true)
      onReady()
    })

    return () => {
      setStyleReady(false)
      map.remove()
      mapRef.current = null
    }
    // The map is built once from the loaded season; later changes are applied
    // imperatively by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // ---- NDVI for the current pass -----------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) {
      return
    }
    for (const feature of data.fields.features) {
      const fieldId = feature.properties.id
      const value = ndvi.get(fieldId)?.get(day)
      map.setFeatureState(
        { source: FIELDS_SOURCE, id: fieldId },
        { ndvi: value === undefined ? null : value },
      )
    }
  }, [data, ndvi, day, styleReady])

  // ---- rainfall raster for the current pass -------------------------------
  useEffect(() => {
    const map = mapRef.current
    const canvas = canvasRef.current
    const raster = rasterRef.current
    if (!map || !styleReady || !canvas || !raster) {
      return
    }
    const layer = map.getLayer(LAYER_RAIN)
    if (!layer) {
      return
    }
    if (precipLayer === 'none') {
      map.setLayoutProperty(LAYER_RAIN, 'visibility', 'none')
      return
    }
    const totals = precipLayer === 'cumulative' ? rainfall.cumulative : rainfall.trailing14
    const url = paintRainfall(canvas, raster, totals, day, precipLayer)
    if (url) {
      ;(map.getSource(RAIN_SOURCE) as ImageSource | undefined)?.updateImage({ url })
      map.setLayoutProperty(LAYER_RAIN, 'visibility', 'visible')
    }
  }, [rainfall, day, precipLayer, styleReady])

  // ---- field visibility and selection -------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) {
      return
    }
    const visibility = showFields ? 'visible' : 'none'
    for (const id of [LAYER_FIELD_FILL, LAYER_FIELD_LINE, LAYER_FIELD_SELECTED]) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility)
      }
    }
  }, [showFields, styleReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady || !map.getLayer(LAYER_FIELD_SELECTED)) {
      return
    }
    map.setFilter(LAYER_FIELD_SELECTED, ['==', ['get', 'id'], selectedFieldId ?? -1])
  }, [selectedFieldId, styleReady])

  const zoomToField = useCallback(
    (fieldId: number) => {
      const map = mapRef.current
      const feature = data.fields.features.find((f) => f.properties.id === fieldId)
      if (map && feature) {
        map.fitBounds(featureBounds(feature), { padding: 120, maxZoom: 15, duration: 900 })
      }
    },
    [data],
  )

  // Expose the zoom action on the container so the detail panel can call it
  // without the explorer having to hold a map reference of its own.
  useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }
    const handler = (event: Event) => {
      const fieldId = (event as CustomEvent<number>).detail
      zoomToField(fieldId)
    }
    node.addEventListener('zoom-to-field', handler)
    return () => node.removeEventListener('zoom-to-field', handler)
  }, [zoomToField])

  return <div className="sse-map" ref={containerRef} data-testid="season-map" />
}

/** Ask the map to frame one field. Dispatched rather than wired through props
 * so the button in the detail panel does not force the map to re-render. */
export function requestZoomToField(fieldId: number): void {
  const node = document.querySelector('.sse-map')
  node?.dispatchEvent(new CustomEvent<number>('zoom-to-field', { detail: fieldId }))
}
