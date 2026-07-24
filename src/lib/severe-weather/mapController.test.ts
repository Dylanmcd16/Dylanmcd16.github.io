import { describe, expect, it } from 'vitest'
import { radarUrl } from './mapController'
import type { ImageCoordinates, TimelineFrame } from './mapTypes'

const COORDS: ImageCoordinates = [
  [-97, 44],
  [-89, 44],
  [-89, 40],
  [-97, 40],
]

const frame: TimelineFrame = {
  index: 0,
  validTimeUtc: '2020-08-10T17:00:00Z',
  displayTimeCentral: '12:00 PM CDT',
  radar: {
    url: 'data/x/radar/frame-00.webp',
    validTimeUtc: '2020-08-10T17:00:00Z',
    sourceTimeUtc: '2020-08-10T17:00:00Z',
    coordinates: COORDS,
    available: true,
    products: {
      reflectivity: 'data/x/radar/frame-00.webp',
      velocity: 'data/x/radar/velocity-00.webp',
    },
  },
  satellite: null,
  hrrr: null,
}

describe('radarUrl', () => {
  it('selects the reflectivity raster by default product', () => {
    expect(radarUrl(frame, 'reflectivity')).toContain('frame-00.webp')
  })

  it('selects the velocity raster when requested', () => {
    expect(radarUrl(frame, 'velocity')).toContain('velocity-00.webp')
  })

  it('returns null for velocity when the frame has no velocity product', () => {
    const noVel: TimelineFrame = {
      ...frame,
      radar: { ...frame.radar!, products: undefined },
    }
    expect(radarUrl(noVel, 'velocity')).toBeNull()
    expect(radarUrl(noVel, 'reflectivity')).toContain('frame-00.webp')
  })
})
