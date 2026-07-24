import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEventPlayback } from './useEventPlayback'

afterEach(() => {
  vi.useRealTimers()
})

describe('useEventPlayback', () => {
  it('advances one frame with next', () => {
    const { result } = renderHook(() => useEventPlayback({ frameCount: 6 }))
    act(() => result.current.next())
    expect(result.current.frameIndex).toBe(1)
  })

  it('wraps to frame zero after the last frame', () => {
    const { result } = renderHook(() => useEventPlayback({ frameCount: 3, initialFrame: 2 }))
    act(() => result.current.next())
    expect(result.current.frameIndex).toBe(0)
  })

  it('wraps to the last frame when stepping back from zero', () => {
    const { result } = renderHook(() => useEventPlayback({ frameCount: 3 }))
    act(() => result.current.previous())
    expect(result.current.frameIndex).toBe(2)
  })

  it('restart returns to zero and pauses', () => {
    const { result } = renderHook(() => useEventPlayback({ frameCount: 3, initialFrame: 2 }))
    act(() => result.current.setIsPlaying(true))
    act(() => result.current.restart())
    expect(result.current.frameIndex).toBe(0)
    expect(result.current.isPlaying).toBe(false)
  })

  it('advances automatically while playing', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useEventPlayback({ frameCount: 6, millisecondsPerFrame: 500 }),
    )
    act(() => result.current.setIsPlaying(true))
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.frameIndex).toBe(1)
  })
})
