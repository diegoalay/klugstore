import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isStaleChunkError, reloadOnce } from '@/boot/chunk-recovery'

describe('stale chunk recovery after a deploy', () => {
  let assign: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    assign = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign,
    } as unknown as Location)
  })

  afterEach(() => vi.useRealTimers())

  it('recognizes the browser errors for missing chunks', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true)
    expect(isStaleChunkError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new Error('Network down'))).toBe(false)
  })

  it('reloads once and then lets the error through to avoid a loop', () => {
    const url = 'https://sweethome.gt/catalog'
    expect(reloadOnce(url)).toBe(true)
    expect(reloadOnce(url)).toBe(false)
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('allows another reload once the lock expires', () => {
    vi.useFakeTimers()
    const url = 'https://sweethome.gt/catalog'
    reloadOnce(url)
    vi.advanceTimersByTime(16_000)
    expect(reloadOnce(url)).toBe(true)
    expect(assign).toHaveBeenCalledTimes(2)
  })
})
