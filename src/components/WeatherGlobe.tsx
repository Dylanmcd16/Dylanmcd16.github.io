import { useEffect, useRef, useState } from 'react'
import {
  buildPrecipImageryProvider,
  fetchLatestGibsWeatherLayers,
  type PrecipLayerInfo,
} from './weatherLayers'

/* ==========================================================================
   WeatherGlobe — ported from Atmosky's landing-page hero.

   A live CesiumJS globe with NASA GIBS near-real-time precipitation
   (GPM IMERG) streamed on top, a scroll-grow "zoom in on Earth" effect,
   and a static textured sphere as fallback if Cesium fails to load.
   ========================================================================== */

type Status = 'loading' | 'ready' | 'fallback'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

function attachOverlayErrorHandler(provider: any, layer: any, maxErrors = 8) {
  let errors = 0
  provider.errorEvent?.addEventListener?.((error: any) => {
    errors += 1
    if (error) {
      error.retry = errors <= maxErrors
    }
    if (errors > maxErrors && layer) {
      layer.show = false
    }
  })
}

function waitForFirstRender(scene: any): Promise<void> {
  return new Promise((resolve) => {
    let frames = 0
    const onPostRender = () => {
      frames += 1
      if (frames >= 3) {
        scene.postRender.removeEventListener(onPostRender)
        resolve()
      }
    }
    scene.postRender.addEventListener(onPostRender)
    scene.requestRender()
  })
}

// Resolve once the tiles queued by a just-added overlay have drained, or after
// a safety timeout — lets the reproject/tile work happen while invisible.
function waitForTilesSettled(scene: any, maxMs = 2400): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    let sawPending = false
    const onProgress = (remaining: number) => {
      if (remaining > 0) {
        sawPending = true
      } else if (sawPending) {
        finish()
      }
    }
    const finish = () => {
      if (done) return
      done = true
      scene.globe.tileLoadProgressEvent.removeEventListener(onProgress)
      window.clearTimeout(to)
      resolve()
    }
    scene.globe.tileLoadProgressEvent.addEventListener(onProgress)
    const to = window.setTimeout(finish, maxMs)
    scene.requestRender()
  })
}

function waitForGlobeTiles(scene: any): Promise<void> {
  return new Promise((resolve) => {
    if (scene.globe.tilesLoaded) {
      resolve()
      return
    }
    const onProgress = (remaining: number) => {
      if (remaining === 0) {
        scene.globe.tileLoadProgressEvent.removeEventListener(onProgress)
        resolve()
      }
    }
    scene.globe.tileLoadProgressEvent.addEventListener(onProgress)
    scene.requestRender()
  })
}

// Static textured sphere shown only if Cesium fails (offline, blocked, etc.).
function FallbackGlobe() {
  const base = import.meta.env.BASE_URL
  return (
    <div className="globe-fallback">
      <div
        className="globe-fallback-layer globe-fallback-earth"
        style={{ backgroundImage: `url(${base}globe/earth.png)` }}
      />
      <div
        className="globe-fallback-layer globe-fallback-precip"
        style={{ backgroundImage: `url(${base}globe/precip.png)` }}
      />
      <div className="globe-fallback-shade" />
    </div>
  )
}

export default function WeatherGlobe() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [showCanvas, setShowCanvas] = useState(false)

  // Grow the globe as the hero scrolls toward the next section — a subtle
  // "zoom in on Earth" feel — and fade it late so it never pops out.
  const wrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const hero = wrap.closest('section') ?? wrap
    let raf = 0
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

    const update = () => {
      raf = 0
      const rect = hero.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const growP = clamp01(-rect.top / (vh * 0.9))
      const scale = 1 + growP * 1.5
      const fadeP = clamp01((vh * 0.35 - rect.bottom) / (vh * 0.4))
      wrap.style.setProperty('--globe-scale', scale.toFixed(3))
      wrap.style.opacity = (1 - fadeP).toFixed(3)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll, { capture: true } as any)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    let viewer: any = null
    let rafId = 0
    let fadeRafId = 0
    let cancelled = false
    const controller = new AbortController()

    // Start the slow GIBS GetCapabilities fetch right away, in parallel with
    // the Cesium import + globe build.
    const layersPromise = fetchLatestGibsWeatherLayers(controller.signal).catch(
      () => ({}) as { precip?: PrecipLayerInfo },
    )

    // Ease a freshly-added imagery layer up to its target alpha so the precip
    // overlay drifts in rather than popping on.
    const fadeInLayer = (layer: any, targetAlpha: number, durationMs = 1100) => {
      layer.alpha = 0
      const startedAt = performance.now()
      const step = (now: number) => {
        if (cancelled || !viewer) return
        const t = Math.min(1, (now - startedAt) / durationMs)
        layer.alpha = targetAlpha * (1 - Math.pow(1 - t, 3))
        viewer.scene.requestRender()
        if (t < 1) fadeRafId = requestAnimationFrame(step)
      }
      fadeRafId = requestAnimationFrame(step)
    }

    const start = () => {
      if (cancelled || !containerRef.current) return
      import('cesium')
        .then(async (Cesium: any) => {
          if (cancelled || !containerRef.current) return

          ;(window as any).CESIUM_BASE_URL =
            (window as any).CESIUM_BASE_URL || '/cesium'

          viewer = new Cesium.Viewer(containerRef.current, {
            animation: false,
            timeline: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            baseLayerPicker: false,
            navigationHelpButton: false,
            fullscreenButton: false,
            infoBox: false,
            selectionIndicator: false,
            creditContainer: document.createElement('div'),
            baseLayer: false,
            contextOptions: { webgl: { alpha: true, antialias: true } },
            msaaSamples: 4,
          })

          const scene = viewer.scene
          scene.backgroundColor = Cesium.Color.TRANSPARENT
          if (scene.postProcessStages?.fxaa) {
            scene.postProcessStages.fxaa.enabled = true
          }
          if ('msaaSamples' in scene) {
            scene.msaaSamples = 4
          }
          scene.globe.baseColor = Cesium.Color.fromCssColorString('#dfe8f4')
          scene.globe.show = false
          scene.requestRenderMode = true
          scene.maximumRenderTimeChange = Infinity

          const addBaseLayer = async () => {
            let provider: any = null
            try {
              provider = await Cesium.TileMapServiceImageryProvider.fromUrl(
                Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'),
              )
            } catch {
              provider = null
            }
            if (!provider || cancelled || !viewer) return
            const layer = viewer.imageryLayers.addImageryProvider(provider)
            layer.alpha = 1
            layer.brightness = 1.42
            layer.contrast = 0.88
            layer.saturation = 0.58
            layer.gamma = 1.22
          }

          await addBaseLayer()

          scene.globe.showGroundAtmosphere = false
          scene.globe.enableLighting = false
          scene.skyBox.show = false
          scene.sun.show = false
          scene.moon.show = false
          scene.skyAtmosphere.show = false
          scene.fog.enabled = false
          scene.highDynamicRange = false
          if (scene.globe.translucency) {
            scene.globe.translucency.enabled = false
          }

          const c = scene.screenSpaceCameraController
          c.enableRotate = false
          c.enableTranslate = false
          c.enableZoom = false
          c.enableTilt = false
          c.enableLook = false

          // Zoom so the globe overfills the canvas; the dark limb is cropped
          // by the CSS mask instead of showing as a rim. Centered on Iowa.
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(-96, 42, 9_500_000),
          })

          if (cancelled || !viewer) return

          scene.globe.show = true
          scene.requestRenderMode = false
          scene.maximumRenderTimeChange = 0.0

          await waitForGlobeTiles(scene)
          await waitForFirstRender(scene)
          if (cancelled || !viewer) return

          setStatus('ready')
          window.requestAnimationFrame(() => {
            if (!cancelled) setShowCanvas(true)
          })

          if (!prefersReducedMotion()) {
            const spin = () => {
              if (cancelled || !viewer) return
              viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0002)
              rafId = requestAnimationFrame(spin)
            }
            rafId = requestAnimationFrame(spin)
          }

          // Stream the near-real-time precip overlay AFTER the globe is
          // visible so a slow/failed GIBS call never delays the hero.
          layersPromise
            .then(async (layers) => {
              if (cancelled || !viewer || !layers.precip) return
              try {
                const precipProvider = buildPrecipImageryProvider(
                  Cesium,
                  layers.precip,
                )
                const precipLayer =
                  viewer.imageryLayers.addImageryProvider(precipProvider)
                precipLayer.alpha = 0
                precipLayer.saturation = 0.68
                precipLayer.contrast = 0.94
                precipLayer.brightness = 1.02
                precipLayer.colorToAlpha = Cesium.Color.BLACK
                precipLayer.colorToAlphaThreshold = 0.08

                attachOverlayErrorHandler(precipProvider, precipLayer, 8)

                await waitForTilesSettled(scene)
                if (cancelled || !viewer) return
                fadeInLayer(precipLayer, 0.5, 1400)
              } catch {
                /* Keep the base globe if precipitation fails. */
              }
            })
            .catch(() => {
              /* Keep the clean base globe visible if GIBS overlays fail. */
            })
        })
        .catch(() => {
          if (!cancelled) setStatus('fallback')
        })
    }

    const idle =
      (window as any).requestIdleCallback?.(start, { timeout: 400 }) ??
      window.setTimeout(start, 80)

    return () => {
      cancelled = true
      controller.abort()
      if (rafId) cancelAnimationFrame(rafId)
      if (fadeRafId) cancelAnimationFrame(fadeRafId)
      ;(window as any).cancelIdleCallback?.(idle)
      if (viewer && !viewer.isDestroyed?.()) {
        try {
          viewer.destroy()
        } catch {
          /* noop */
        }
      }
    }
    // Build the globe exactly once.
  }, [])

  const canvasVisible = status === 'ready' && showCanvas

  return (
    <div className="globe-wrap" aria-hidden="true">
      <div ref={wrapRef} className="globe-stage">
        {status === 'fallback' && <FallbackGlobe />}
        <div
          ref={containerRef}
          className={`globe-canvas ${canvasVisible ? 'is-ready' : ''}`}
        />
        <div className="globe-haze" />
      </div>
    </div>
  )
}
