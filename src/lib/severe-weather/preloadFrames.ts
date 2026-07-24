import type { HrrrVariable, TimelineFrame } from './mapTypes'

// Collect the raster URLs for the next few frames so playback stays smooth.
// Exported separately from the DOM side-effect so it can be unit tested.
export function upcomingFrameUrls(
  frames: TimelineFrame[],
  currentIndex: number,
  hrrrVariable: HrrrVariable,
  count = 3,
): string[] {
  const urls = new Set<string>()

  for (
    let index = currentIndex + 1;
    index <= Math.min(currentIndex + count, frames.length - 1);
    index += 1
  ) {
    const frame = frames[index]

    if (frame.radar?.available) {
      urls.add(frame.radar.url)
    }

    if (frame.satellite?.available) {
      urls.add(frame.satellite.url)
    }

    const hrrr = frame.hrrr?.variables[hrrrVariable]

    if (hrrr?.available) {
      urls.add(hrrr.url)
    }
  }

  return [...urls]
}

export function preloadUpcomingFrames(
  frames: TimelineFrame[],
  currentIndex: number,
  hrrrVariable: HrrrVariable,
  count = 3,
): void {
  for (const url of upcomingFrameUrls(frames, currentIndex, hrrrVariable, count)) {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
  }
}
