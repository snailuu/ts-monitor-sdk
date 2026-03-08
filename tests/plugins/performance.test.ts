import { describe, expect, it, vi } from 'vitest'
import { performancePlugin } from '../../src/plugins/performance'

describe('performancePlugin', () => {
  it('name 为 "performance"', () => {
    expect(performancePlugin().name).toBe('performance')
  })

  it('setup 不抛错', () => {
    const ctx = {
      report: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
    }
    const plugin = performancePlugin()
    expect(() => plugin.setup(ctx)).not.toThrow()
    plugin.destroy?.()
  })

  it('destroy 不抛错', () => {
    const ctx = {
      report: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
    }
    const plugin = performancePlugin()
    plugin.setup(ctx)
    expect(() => plugin.destroy?.()).not.toThrow()
  })
})
