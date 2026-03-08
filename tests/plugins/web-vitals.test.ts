import { afterEach, describe, expect, it, vi } from 'vitest'
import { webVitalsPlugin } from '../../src/plugins/web-vitals'
import { EventType } from '../../src/types'
import { createMockContext } from '../helpers'

describe('webVitalsPlugin', () => {
  it('name 为 "web-vitals"', () => {
    expect(webVitalsPlugin().name).toBe('web-vitals')
  })

  it('setup 和 destroy 不抛出异常', () => {
    const ctx = createMockContext()
    const plugin = webVitalsPlugin()

    expect(() => plugin.setup(ctx)).not.toThrow()
    expect(() => plugin.destroy?.()).not.toThrow()
  })

  it('TTFB 基于 navigation timing 上报', () => {
    const ctx = createMockContext()

    // 模拟 PerformanceNavigationTiming
    const navEntry = {
      entryType: 'navigation',
      requestStart: 100,
      responseStart: 250,
    }
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([navEntry as any])

    const plugin = webVitalsPlugin()
    plugin.setup(ctx)

    const ttfbReports = ctx.reported.filter(
      r => r.type === EventType.PERFORMANCE && r.data.name === 'TTFB',
    )
    expect(ttfbReports).toHaveLength(1)
    expect(ttfbReports[0].data.value).toBe(150) // 250 - 100
    expect(ttfbReports[0].data.kind).toBe('web-vitals')

    plugin.destroy?.()
    vi.restoreAllMocks()
  })

  it('visibilitychange hidden 时上报 LCP/CLS/INP', () => {
    const ctx = createMockContext()

    // 在 jsdom 中 PerformanceObserver 能力有限，主要测试 visibility 回调逻辑
    const plugin = webVitalsPlugin()
    plugin.setup(ctx)

    // 模拟页面隐藏
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // 由于 jsdom 中 PerformanceObserver 不会真正触发，LCP/CLS/INP 值为 0，不上报
    // 验证不会因为 0 值而产生无意义上报
    const vitalsReports = ctx.reported.filter(
      r => r.type === EventType.PERFORMANCE && r.data.kind === 'web-vitals'
        && ['LCP', 'CLS', 'INP'].includes(r.data.name as string),
    )
    expect(vitalsReports).toHaveLength(0)

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    plugin.destroy?.()
  })

  it('destroy 后 visibilitychange 不再触发上报', () => {
    const ctx = createMockContext()
    const plugin = webVitalsPlugin()
    plugin.setup(ctx)
    plugin.destroy?.()

    // 清空之前的上报
    ctx.reported.length = 0

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    const afterDestroy = ctx.reported.filter(
      r => r.type === EventType.PERFORMANCE && r.data.kind === 'web-vitals',
    )
    expect(afterDestroy).toHaveLength(0)

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })
})
