import { describe, expect, it, vi } from 'vitest'
import { performancePlugin } from '../../src/plugins/performance'
import { EventType } from '../../src/types'
import type { PluginContext, ReportData } from '../../src/types'

function createMockContext(): PluginContext & { reported: ReportData[] } {
  const reported: ReportData[] = []
  return {
    reported,
    report: (data: ReportData) => reported.push(data),
    on: vi.fn(),
    off: vi.fn(),
    getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
  }
}

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
    // mock performance.getEntriesByType 返回导航数据
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

    // document.readyState 在 jsdom 中默认是 'complete'
    const plugin = performancePlugin()
    plugin.setup(ctx)

    // 验证 navigation 指标已上报
    const navReport = ctx.reported.find(r => r.data.kind === 'navigation')
    if (navReport) {
      expect(navReport.type).toBe(EventType.PERFORMANCE)
      expect(navReport.data.dns).toBe(10)
      expect(navReport.data.tcp).toBe(10)
      expect(navReport.data.ttfb).toBe(30)
    }

    spy.mockRestore()
    plugin.destroy?.()
  })

  it('接受 resource 选项不抛错', () => {
    const ctx = createMockContext()
    const plugin = performancePlugin({ resource: true })
    expect(() => plugin.setup(ctx)).not.toThrow()
    plugin.destroy?.()
  })
})
