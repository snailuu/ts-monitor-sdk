import { describe, expect, it, vi } from 'vitest'
import { errorPlugin } from '../../src/plugins/error'
import { EventType } from '../../src/types'
import type { PluginContext, ReportData } from '../../src/types'

/** 创建模拟的插件上下文 */
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

describe('errorPlugin', () => {
  it('name 为 "error"', () => {
    expect(errorPlugin().name).toBe('error')
  })

  it('捕获 window.onerror', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin()
    plugin.setup(ctx)

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'test error',
        filename: 'app.js',
        lineno: 10,
        colno: 5,
        error: new Error('test error'),
      }),
    )

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].type).toBe(EventType.ERROR)
    expect(ctx.reported[0].data.message).toBe('test error')
    plugin.destroy?.()
  })

  it('捕获 unhandledrejection', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin()
    plugin.setup(ctx)

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('promise rejected'),
      }),
    )

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].data.message).toBe('promise rejected')
    plugin.destroy?.()
  })

  it('destroy 后不再捕获错误', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin()
    plugin.setup(ctx)
    plugin.destroy?.()

    // 注意：不传 error 属性，避免 jsdom 将其视为未捕获异常
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'after destroy',
      }),
    )

    expect(ctx.reported).toHaveLength(0)
  })
})
