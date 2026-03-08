import { describe, expect, it } from 'vitest'
import { isBrowser, isNode, getTimestamp } from '../../src/utils/env'

describe('env utils', () => {
  it('isBrowser 在 jsdom 环境返回 true', () => {
    expect(isBrowser()).toBe(true)
  })

  it('isNode 在 jsdom 环境返回 true', () => {
    expect(isNode()).toBe(true)
  })

  it('getTimestamp 返回毫秒级时间戳', () => {
    const now = Date.now()
    const ts = getTimestamp()
    expect(ts).toBeGreaterThanOrEqual(now - 10)
    expect(ts).toBeLessThanOrEqual(now + 10)
  })
})
