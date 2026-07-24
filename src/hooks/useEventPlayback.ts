import { useCallback, useEffect, useState } from 'react'

interface UseEventPlaybackOptions {
  frameCount: number
  initialFrame?: number
  millisecondsPerFrame?: number
}

export function useEventPlayback({
  frameCount,
  initialFrame = 0,
  millisecondsPerFrame = 700,
}: UseEventPlaybackOptions) {
  const [frameIndex, setFrameIndex] = useState(initialFrame)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const lastFrame = Math.max(0, frameCount - 1)

  const next = useCallback(() => {
    setFrameIndex((current) => (current >= lastFrame ? 0 : current + 1))
  }, [lastFrame])

  const previous = useCallback(() => {
    setFrameIndex((current) => (current <= 0 ? lastFrame : current - 1))
  }, [lastFrame])

  const restart = useCallback(() => {
    setFrameIndex(0)
    setIsPlaying(false)
  }, [])

  // Clamp the current frame if the timeline length changes underneath us.
  useEffect(() => {
    setFrameIndex((current) => Math.min(current, lastFrame))
  }, [lastFrame])

  useEffect(() => {
    if (!isPlaying || frameCount <= 1) {
      return
    }

    const intervalId = window.setInterval(next, millisecondsPerFrame / speed)

    return () => window.clearInterval(intervalId)
  }, [frameCount, isPlaying, millisecondsPerFrame, next, speed])

  return {
    frameIndex,
    setFrameIndex,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    next,
    previous,
    restart,
  }
}
