import { useEffect, useRef } from 'react'
import { Map, NavigationControl, type LngLatBoundsLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

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
      style: 'https://tiles.openfreemap.org/styles/positron',
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
