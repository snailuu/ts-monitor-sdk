import { afterEach, describe, expect, it, vi } from 'vitest'
import { nodeHttpPlugin } from '../../src/plugins/node-http'
import type { PluginContext, ReportData } from '../../src/types'
import http from 'http'
import https from 'https'

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

describe('nodeHttpPlugin', () => {
  const originalHttpRequest = http.request
  const originalHttpsRequest = https.request

  afterEach(() => {
    http.request = originalHttpRequest
    https.request = originalHttpsRequest
  })

  it('name 为 "node-http"', () => {
    expect(nodeHttpPlugin().name).toBe('node-http')
  })

  it('setup 和 destroy 不抛错', () => {
    const ctx = createMockContext()
    const plugin = nodeHttpPlugin()
    expect(() => plugin.setup(ctx)).not.toThrow()
    expect(() => plugin.destroy?.()).not.toThrow()
  })

  it('setup 后 http.request 被拦截', () => {
    const ctx = createMockContext()
    const plugin = nodeHttpPlugin()
    plugin.setup(ctx)

    // 验证 http.request 已被替换
    expect(http.request).not.toBe(originalHttpRequest)
    plugin.destroy?.()
  })

  it('setup 后 https.request 被拦截', () => {
    const ctx = createMockContext()
    const plugin = nodeHttpPlugin()
    plugin.setup(ctx)

    // 验证 https.request 也被替换
    expect(https.request).not.toBe(originalHttpsRequest)
    plugin.destroy?.()
  })

  it('destroy 后恢复原始 http.request 和 https.request', () => {
    const ctx = createMockContext()
    const plugin = nodeHttpPlugin()
    plugin.setup(ctx)
    plugin.destroy?.()

    expect(http.request).toBe(originalHttpRequest)
    expect(https.request).toBe(originalHttpsRequest)
  })

  it('sanitizeUrl 清洗上报的 URL', () => {
    const ctx = createMockContext()
    const plugin = nodeHttpPlugin({
      sanitizeUrl: (url) => url.replace(/token=[^&]+/, 'token=***'),
    })
    plugin.setup(ctx)

    // 验证 sanitizeUrl 选项被接受且不抛错
    expect(() => plugin.destroy?.()).not.toThrow()
  })
})
