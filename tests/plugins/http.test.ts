import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpPlugin } from '../../src/plugins/http'
import { EventType } from '../../src/types'
import { createMockContext } from '../helpers'

describe('httpPlugin', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('name 为 "http"', () => {
    expect(httpPlugin().name).toBe('http')
  })

  it('拦截 fetch 并上报', async () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin()
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    plugin.setup(ctx)

    await fetch('https://api.example.com/data', { method: 'GET' })

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].type).toBe(EventType.HTTP)
    expect(ctx.reported[0].data.url).toBe('https://api.example.com/data')
    expect(ctx.reported[0].data.status).toBe(200)
    plugin.destroy?.()
  })

  it('不拦截发往 dsn 的请求', async () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin()
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    plugin.setup(ctx)

    await fetch('https://monitor.com/api', { method: 'POST' })

    expect(ctx.reported).toHaveLength(0)
    plugin.destroy?.()
  })

  it('ignoreUrls 过滤指定请求', async () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin({ ignoreUrls: [/health/] })
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    plugin.setup(ctx)

    await fetch('https://api.example.com/health')

    expect(ctx.reported).toHaveLength(0)
    plugin.destroy?.()
  })

  it('fetch 失败时上报错误信息', async () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin()
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    plugin.setup(ctx)

    try { await fetch('https://api.example.com/data') }
    catch {}

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].data.status).toBe(0)
    expect(ctx.reported[0].data.error).toBe('Network error')
    plugin.destroy?.()
  })

  it('sanitizeUrl 清洗上报的 URL', async () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin({
      sanitizeUrl: (url) => url.replace(/token=[^&]+/, 'token=***'),
    })
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    plugin.setup(ctx)

    await fetch('https://api.example.com/data?token=secret123')

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].data.url).toBe('https://api.example.com/data?token=***')
    plugin.destroy?.()
  })
})
