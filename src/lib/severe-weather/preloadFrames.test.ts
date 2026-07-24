import { describe, expect, it } from 'vitest'
import { upcomingFrameUrls } from './preloadFrames'
import type { ImageCoordinates, TimelineFrame } from './mapTypes'

const COORDS: ImageCoordinates = [
  [-97, 44],
  [-89, 44],
  [-89, 40],
  [-97, 40],
]

function frame(index: number, radarAvailable = true): TimelineFrame {
  return {
    index,
    validTimeUtc: `2020-08-10T17:${String(index * 5).padStart(2, '0')}:00Z`,
    displayTimeCentral: 'x',
    radar: {
      url: `radar/frame-${index}.webp`,
      validTimeUtc: 'x',
      sourceTimeUtc: null,
      coordinates: COORDS,
      available: radarAvailable,
    },
    satellite: null,
    hrrr: null,
  }
}

describe('upcomingFrameUrls', () => {
  it('returns the next N frame rasters', () => {
    const frames = [0, 1, 2, 3, 4].map((i) => frame(i))
    expect(upcomingFrameUrls(frames, 0, 'composite_reflectivity', 3)).toEqual([
      'radar/frame-1.webp',
      'radar/frame-2.webp',
      'radar/frame-3.webp',
    ])
  })

  it('skips unavailable rasters and does not run past the end', () => {
    const frames = [frame(0), frame(1, false), frame(2)]
    expect(upcomingFrameUrls(frames, 0, 'composite_reflectivity', 3)).toEqual(['radar/frame-2.webp'])
  })
})
