import { describe, expect, it } from 'vitest'
import { assetUrl } from './assetUrl'

describe('assetUrl', () => {
  it('joins a relative path onto the base without double slashes', () => {
    const base = import.meta.env.BASE_URL
    expect(assetUrl('data/x.json')).toBe(`${base}data/x.json`)
  })

  it('is unaffected by a leading slash on the input', () => {
    expect(assetUrl('/data/x.json')).toBe(assetUrl('data/x.json'))
  })
})
