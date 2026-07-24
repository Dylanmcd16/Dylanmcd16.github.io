import { useEffect, useRef } from 'react'
import { Map, NavigationControl, type LngLatBoundsLike, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Satellite basemap: Esri World Imagery with a light label overlay so cities
// stay readable beneath the weather layers.
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
    'carto-labels': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'esri-imagery', type: 'raster', source: 'esri-imagery' },
    { id: 'carto-labels', type: 'raster', source: 'carto-labels', paint: { 'raster-opacity': 0.9 } },
  ],
}

interface DerechoMapProps {
  viewBounds: LngLatBoundsLike
  maxBounds: LngLatBoundsLike
  maximumZoom: number
  onMapReady: (map: Map) => void
}

// A MapLibre map locked to Iowa: the user can zoom in and pan within a small
// buffer, but cannot zoom out past the statewide view or pan away from the state.
export function DerechoMap({ viewBounds, maxBounds, maximumZoom, onMapReady }: DerechoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      maxBounds,
      maxZoom: maximumZoom,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })

    mapRef.current = map
    map.touchZoomRotate.disableRotation()

    // Derive the statewide minimum zoom from the actual container size so the
    // constraint fits both desktop and mobile widths instead of a fixed number.
    const lockStatewideExtent = () => {
      const camera = map.cameraForBounds(viewBounds, { padding: 24 })
      if (!camera || camera.zoom == null) {
        return
      }

      map.setMinZoom(camera.zoom)

      if (map.getZoom() < camera.zoom && camera.center) {
        map.jumpTo({ center: camera.center, zoom: camera.zoom })
      }
    }

    map.on('load', () => {
      lockStatewideExtent()
      map.fitBounds(viewBounds, { padding: 24, duration: 0 })
      onMapReady(map)
    })

    map.on('resize', lockStatewideExtent)
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [maximumZoom, maxBounds, onMapReady, viewBounds])

  return <div ref={containerRef} className="derecho-map" />
}
