import { describe, expect, it, vi } from 'vitest'
import { performancePlugin } from '../../src/plugins/performance'
import { EventType } from '../../src/types'
import { createMockContext } from '../helpers'

describe('performancePlugin', () => {
  it('name 为 "performance"', () => {
    expect(performancePlugin().name).toBe('performance')
  })

  it('setup 不抛错', () => {
    const ctx = createMockContext()
    const plugin = performancePlugin()
    expect(() => plugin.setup(ctx)).not.toThrow()
    plugin.destroy?.()
  })

  it('destroy 不抛错', () => {
    const ctx = createMockContext()
    const plugin = performancePlugin()
    plugin.setup(ctx)
    expect(() => plugin.destroy?.()).not.toThrow()
  })

  it('页面已加载时上报 navigation 指标', () => {
    const ctx = createMockContext()
    const mockNav = {
      domainLookupStart: 0,
      domainLookupEnd: 10,
      connectStart: 10,
      connectEnd: 20,
      requestStart: 20,
      responseStart: 50,
      responseEnd: 80,
      fetchStart: 0,
      domContentLoadedEventEnd: 200,
      loadEventEnd: 300,
      domInteractive: 150,
    }
    const spy = vi.spyOn(performance, 'getEntriesByType').mockReturnValue([mockNav as any])

    const plugin = performancePlugin()
    plugin.setup(ctx)

    const navReport = ctx.reported.find(r => r.data.kind === 'navigation')
    expect(navReport).toBeDefined()
    expect(navReport!.type).toBe(EventType.PERFORMANCE)
    expect(navReport!.data.dns).toBe(10)
    expect(navReport!.data.tcp).toBe(10)
    expect(navReport!.data.ttfb).toBe(30)

    spy.mockRestore()
    plugin.destroy?.()
  })
})
