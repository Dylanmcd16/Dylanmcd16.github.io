import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type LngLatBoundsLike, type MapGeoJSONFeature, Map, Popup } from 'maplibre-gl'
import type {
  EventManifest,
  ExplorerDisplayState,
  HrrrVariable,
  PrimaryWeatherLayer,
  SatelliteProduct,
  StationOverlay,
  TimelineFrame,
} from '../../lib/severe-weather/mapTypes'
import { assetUrl } from '../../lib/severe-weather/assetUrl'
import { addWeatherLayers, addWeatherSources, loadVectorSource } from '../../lib/severe-weather/mapLayers'
import { updateMapForFrame } from '../../lib/severe-weather/mapController'
import { applyDisplayState } from '../../lib/severe-weather/displayState'
import { applyStationOverlay } from '../../lib/severe-weather/stationOverlay'
import { preloadUpcomingFrames } from '../../lib/severe-weather/preloadFrames'
import { useEventPlayback } from '../../hooks/useEventPlayback'
import { DerechoMap } from './DerechoMap'
import { PlaybackControls } from './PlaybackControls'
import { EventClock } from './EventClock'
import { MeteorologicalLayerControls } from './MeteorologicalLayerControls'
import { StationOverlayControls } from './StationOverlayControls'
import { OverlayControls } from './OverlayControls'
import { DynamicLegend } from './DynamicLegend'
import { DataStatusPanel } from './DataStatusPanel'

const MANIFEST_URL = assetUrl('data/iowa-severe-weather/event-manifest.json')
const TRANSPARENT_URL = assetUrl('data/iowa-severe-weather/transparent.png')

const INITIAL_DISPLAY_STATE: ExplorerDisplayState = {
  primaryLayer: 'radar',
  satelliteUnderRadar: false,
  satelliteProduct: 'sandwich',
  stationOverlay: 'none',
  hrrrVariable: 'composite_reflectivity',
  showReports: true,
  showWarnings: true,
  showPostEventAssessments: false,
}

type LoadStatus = 'loading' | 'ready' | 'error'

interface StationSeries {
  name: string
  times: string[]
  temperature_f: (number | null)[]
  dewpoint_f: (number | null)[]
  wind_mph: (number | null)[]
  gust_mph: (number | null)[]
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function reportPopupHtml(props: Record<string, unknown>): string {
  const magnitude =
    props.magnitude != null ? `${escapeHtml(props.magnitude)} ${escapeHtml(props.magnitude_units)}` : '—'
  const measured = props.measured ? 'Measured' : 'Estimated'
  const delayed = props.delayed_report ? '<span class="swx-popup__flag">Delayed report</span>' : ''
  return `
    <div class="swx-popup">
      <p class="swx-popup__kind">${escapeHtml(String(props.event_type).replace(/_/g, ' '))}</p>
      <p class="swx-popup__time">${escapeHtml(props.event_time_utc)}</p>
      <dl>
        <div><dt>Location</dt><dd>${escapeHtml(props.location)}</dd></div>
        <div><dt>Magnitude</dt><dd>${magnitude} (${measured})</dd></div>
        <div><dt>Source</dt><dd>${escapeHtml(String(props.source).replace(/_/g, ' '))}</dd></div>
      </dl>
      <p class="swx-popup__remarks">${escapeHtml(props.remarks)}</p>
      ${delayed}
    </div>`
}

function warningPopupHtml(props: Record<string, unknown>): string {
  const issued = new Date(Number(props.issued_time_ms)).toISOString().replace('.000', '')
  const expires = new Date(Number(props.expires_time_ms)).toISOString().replace('.000', '')
  return `
    <div class="swx-popup">
      <p class="swx-popup__kind">${escapeHtml(props.headline)}</p>
      <dl>
        <div><dt>Office</dt><dd>${escapeHtml(props.office)}</dd></div>
        <div><dt>Issued</dt><dd>${escapeHtml(issued)}</dd></div>
        <div><dt>Expires</dt><dd>${escapeHtml(expires)}</dd></div>
      </dl>
    </div>`
}

// A compact multi-series SVG sparkline spanning the whole event, for a station popup.
function sparklineSvg(series: StationSeries): string {
  const w = 240
  const h = 66
  const pad = 4
  const all = [...series.temperature_f, ...series.dewpoint_f, ...series.gust_mph].filter(
    (v): v is number => v != null,
  )
  if (all.length < 2) return ''
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const n = series.times.length
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (w - 2 * pad)
  const y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad)

  const line = (values: (number | null)[], color: string) => {
    const pts = values
      .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(' ')
    return pts ? `<polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts}" />` : ''
  }

  return `
    <svg class="swx-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Event time series">
      ${line(series.gust_mph, '#2f5fd0')}
      ${line(series.dewpoint_f, '#16a34a')}
      ${line(series.temperature_f, '#dc2626')}
    </svg>`
}

function stationPopupHtml(
  props: Record<string, unknown>,
  series: Record<string, StationSeries>,
): string {
  const stale = props.stale ? '<span class="swx-popup__flag">Stale observation</span>' : ''
  const stationSeries = series[String(props.station_id)]
  const chart = stationSeries
    ? `<div class="swx-popup__chart">
         ${sparklineSvg(stationSeries)}
         <p class="swx-popup__legend"><span style="color:#dc2626">Temp</span> · <span style="color:#16a34a">Dew pt</span> · <span style="color:#2f5fd0">Gust</span> — full event</p>
       </div>`
    : ''
  return `
    <div class="swx-popup">
      <p class="swx-popup__kind">${escapeHtml(props.station_name)} (${escapeHtml(props.station_id)})</p>
      <p class="swx-popup__time">${escapeHtml(props.observation_time_utc)} · ${escapeHtml(props.age_minutes)} min old</p>
      <dl>
        <div><dt>Temp</dt><dd>${escapeHtml(props.temperature_f)}°F</dd></div>
        <div><dt>Dew pt</dt><dd>${escapeHtml(props.dewpoint_f)}°F</dd></div>
        <div><dt>Wind</dt><dd>${escapeHtml(props.wind_speed_mph)} mph ${escapeHtml(props.gust_label)}</dd></div>
      </dl>
      ${chart}
      ${stale}
    </div>`
}

function assessmentPopupHtml(props: Record<string, unknown>): string {
  return `
    <div class="swx-popup">
      <p class="swx-popup__kind">${escapeHtml(String(props.kind).replace(/_/g, ' '))} · ${escapeHtml(props.rating)}</p>
      <dl>
        <div><dt>Survey</dt><dd>${escapeHtml(props.survey)}</dd></div>
      </dl>
      <p class="swx-popup__remarks">${escapeHtml(props.note)}</p>
    </div>`
}

export function DerechoExplorer() {
  const [manifest, setManifest] = useState<EventManifest | null>(null)
  const [timeline, setTimeline] = useState<TimelineFrame[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [mapReady, setMapReady] = useState(false)
  const [displayState, setDisplayState] = useState<ExplorerDisplayState>(INITIAL_DISPLAY_STATE)

  const mapRef = useRef<Map | null>(null)
  const timelineRef = useRef<TimelineFrame[]>([])
  const displayStateRef = useRef(displayState)
  const seriesRef = useRef<Record<string, StationSeries>>({})
  const scrubbingRef = useRef(false)

  const {
    frameIndex,
    setFrameIndex,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    next,
    previous,
    restart,
  } = useEventPlayback({ frameCount: timeline.length })

  // Load the manifest, then the timeline it points to.
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const manifestResponse = await fetch(MANIFEST_URL)
        if (!manifestResponse.ok) throw new Error(`manifest ${manifestResponse.status}`)
        const loadedManifest = (await manifestResponse.json()) as EventManifest

        const timelineResponse = await fetch(assetUrl(loadedManifest.files.timeline))
        if (!timelineResponse.ok) throw new Error(`timeline ${timelineResponse.status}`)
        const loadedTimeline = (await timelineResponse.json()) as TimelineFrame[]

        // Station time series (for popup charts) is optional.
        if (loadedManifest.files.stationsSeries) {
          try {
            const seriesResponse = await fetch(assetUrl(loadedManifest.files.stationsSeries))
            if (seriesResponse.ok) {
              seriesRef.current = (await seriesResponse.json()) as Record<string, StationSeries>
            }
          } catch {
            // A missing series file only disables the popup chart.
          }
        }

        if (cancelled) return
        setManifest(loadedManifest)
        setTimeline(loadedTimeline)
        timelineRef.current = loadedTimeline
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    displayStateRef.current = displayState
  }, [displayState])

  const currentFrame = timeline[frameIndex] ?? null

  const bounds = useMemo(() => {
    if (!manifest) return null
    return {
      viewBounds: manifest.map.viewBounds as LngLatBoundsLike,
      maxBounds: manifest.map.maxBounds as LngLatBoundsLike,
      maximumZoom: manifest.map.maximumZoom,
    }
  }, [manifest])

  // Called once the MapLibre instance has loaded its style.
  const handleMapReady = useCallback(
    (map: Map) => {
      mapRef.current = map
      const activeManifest = manifest
      const frames = timelineRef.current
      if (!activeManifest || frames.length === 0) return

      addWeatherSources(map, TRANSPARENT_URL, frames[0].radar?.coordinates)
      addWeatherLayers(map)

      const wirePopup = (
        layerId: string,
        build: (props: Record<string, unknown>) => string,
      ) => {
        map.on('click', layerId, (event) => {
          const feature = event.features?.[0] as MapGeoJSONFeature | undefined
          if (!feature) return
          new Popup({ closeButton: true, maxWidth: '280px' })
            .setLngLat(event.lngLat)
            .setHTML(build(feature.properties as Record<string, unknown>))
            .addTo(map)
        })
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      }

      wirePopup('storm-reports', reportPopupHtml)
      wirePopup('warning-fill', warningPopupHtml)
      wirePopup('station-points', (props) => stationPopupHtml(props, seriesRef.current))
      wirePopup('assessment-fill', assessmentPopupHtml)
      wirePopup('assessment-points', assessmentPopupHtml)

      Promise.all([
        loadVectorSource(map, 'reports-source', assetUrl(activeManifest.files.reports)),
        loadVectorSource(map, 'warnings-source', assetUrl(activeManifest.files.warnings)),
        loadVectorSource(map, 'stations-source', assetUrl(activeManifest.files.stations)),
        loadVectorSource(map, 'assessments-source', assetUrl(activeManifest.files.assessments)),
      ])
        .then(() => {
          updateMapForFrame({
            map,
            frame: frames[0],
            hrrrVariable: displayStateRef.current.hrrrVariable,
            satelliteProduct: displayStateRef.current.satelliteProduct,
            transparentImageUrl: TRANSPARENT_URL,
          })
          applyDisplayState(map, displayStateRef.current)
          setMapReady(true)
        })
        .catch(() => setStatus('error'))
    },
    [manifest],
  )

  // Repaint rasters and re-filter features whenever the frame changes.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !currentFrame) return

    updateMapForFrame({
      map,
      frame: currentFrame,
      hrrrVariable: displayState.hrrrVariable,
      satelliteProduct: displayState.satelliteProduct,
      transparentImageUrl: TRANSPARENT_URL,
    })
    preloadUpcomingFrames(timeline, frameIndex, displayState.hrrrVariable)
  }, [
    mapReady,
    currentFrame,
    frameIndex,
    timeline,
    displayState.hrrrVariable,
    displayState.satelliteProduct,
  ])

  // Apply layer visibility / station styling whenever the display state changes.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    applyDisplayState(map, displayState)
    if (displayState.stationOverlay !== 'none') {
      applyStationOverlay(map, displayState.stationOverlay)
    }
  }, [mapReady, displayState])

  const patchDisplay = useCallback((patch: Partial<ExplorerDisplayState>) => {
    setDisplayState((current) => ({ ...current, ...patch }))
  }, [])

  const handleScrub = useCallback(
    (index: number) => {
      // Dragging the timeline pauses playback.
      if (!scrubbingRef.current) {
        scrubbingRef.current = true
        setIsPlaying(false)
      }
      setFrameIndex(index)
    },
    [setFrameIndex, setIsPlaying],
  )

  useEffect(() => {
    const clear = () => {
      scrubbingRef.current = false
    }
    window.addEventListener('pointerup', clear)
    return () => window.removeEventListener('pointerup', clear)
  }, [])

  if (status === 'error') {
    return (
      <div className="swx-explorer swx-explorer--message">
        <p>The event data for this demonstration could not be loaded.</p>
      </div>
    )
  }

  if (status === 'loading' || !bounds || !currentFrame) {
    return (
      <div className="swx-explorer swx-explorer--message">
        <p>Loading the August 10, 2020 derecho replay…</p>
      </div>
    )
  }

  return (
    <div className="swx-explorer">
      <div className="swx-explorer__stage">
        <DerechoMap
          viewBounds={bounds.viewBounds}
          maxBounds={bounds.maxBounds}
          maximumZoom={bounds.maximumZoom}
          onMapReady={handleMapReady}
        />
        <EventClock
          displayTimeCentral={currentFrame.displayTimeCentral}
          validTimeUtc={currentFrame.validTimeUtc}
        />
        <DynamicLegend
          primaryLayer={displayState.primaryLayer}
          hrrrVariable={displayState.hrrrVariable}
          stationOverlay={displayState.stationOverlay}
          showReports={displayState.showReports}
          showWarnings={displayState.showWarnings}
        />
      </div>

      <div className="swx-explorer__panel">
        <MeteorologicalLayerControls
          primaryLayer={displayState.primaryLayer}
          satelliteUnderRadar={displayState.satelliteUnderRadar}
          satelliteProduct={displayState.satelliteProduct}
          hrrrVariable={displayState.hrrrVariable}
          onPrimaryLayer={(primaryLayer: PrimaryWeatherLayer) => patchDisplay({ primaryLayer })}
          onSatelliteUnderRadar={(satelliteUnderRadar) => patchDisplay({ satelliteUnderRadar })}
          onSatelliteProduct={(satelliteProduct: SatelliteProduct) => patchDisplay({ satelliteProduct })}
          onHrrrVariable={(hrrrVariable: HrrrVariable) => patchDisplay({ hrrrVariable })}
        />
        <StationOverlayControls
          stationOverlay={displayState.stationOverlay}
          onStationOverlay={(stationOverlay: StationOverlay) => patchDisplay({ stationOverlay })}
        />
        <OverlayControls
          showReports={displayState.showReports}
          showWarnings={displayState.showWarnings}
          showPostEventAssessments={displayState.showPostEventAssessments}
          onShowReports={(showReports) => patchDisplay({ showReports })}
          onShowWarnings={(showWarnings) => patchDisplay({ showWarnings })}
          onShowPostEventAssessments={(showPostEventAssessments) =>
            patchDisplay({ showPostEventAssessments })
          }
        />
        <DataStatusPanel
          frame={currentFrame}
          primaryLayer={displayState.primaryLayer}
          stationOverlay={displayState.stationOverlay}
          hrrrVariable={displayState.hrrrVariable}
        />
      </div>

      <PlaybackControls
        frameIndex={frameIndex}
        frameCount={timeline.length}
        isPlaying={isPlaying}
        speed={speed}
        startLabel={timeline[0]?.displayTimeCentral ?? ''}
        endLabel={timeline[timeline.length - 1]?.displayTimeCentral ?? ''}
        onRestart={restart}
        onPrevious={previous}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNext={next}
        onScrub={handleScrub}
        onSpeed={setSpeed}
      />
    </div>
  )
}
