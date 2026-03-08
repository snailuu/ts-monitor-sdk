import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpPlugin } from '../../src/plugins/http'
import { EventType } from '../../src/types'
import { createMockContext } from '../helpers'

describe('httpPlugin', () => {
  const originalFetch = globalThis.fetch
  const originalXhrOpen = XMLHttpRequest.prototype.open
  const originalXhrSend = XMLHttpRequest.prototype.send

  afterEach(() => {
    globalThis.fetch = originalFetch
    XMLHttpRequest.prototype.open = originalXhrOpen
    XMLHttpRequest.prototype.send = originalXhrSend
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

  // === XHR 拦截测试 ===

  it('拦截 XHR 并上报', async () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin()
    plugin.setup(ctx)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://api.example.com/data')
    xhr.send()

    // 触发 loadend 事件
    xhr.dispatchEvent(new Event('loadend'))

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].type).toBe(EventType.HTTP)
    expect(ctx.reported[0].data.url).toBe('https://api.example.com/data')
    expect(ctx.reported[0].data.method).toBe('POST')
    plugin.destroy?.()
  })

  it('XHR 不拦截发往 dsn 的请求', () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin()
    plugin.setup(ctx)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://monitor.com/api')
    xhr.send()
    xhr.dispatchEvent(new Event('loadend'))

    expect(ctx.reported).toHaveLength(0)
    plugin.destroy?.()
  })

  it('XHR ignoreUrls 过滤指定请求', () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin({ ignoreUrls: [/health/] })
    plugin.setup(ctx)

    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://api.example.com/health')
    xhr.send()
    xhr.dispatchEvent(new Event('loadend'))

    expect(ctx.reported).toHaveLength(0)
    plugin.destroy?.()
  })

  it('XHR sanitizeUrl 清洗上报的 URL', () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin({
      sanitizeUrl: (url) => url.replace(/token=[^&]+/, 'token=***'),
    })
    plugin.setup(ctx)

    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://api.example.com/data?token=secret123')
    xhr.send()
    xhr.dispatchEvent(new Event('loadend'))

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].data.url).toBe('https://api.example.com/data?token=***')
    plugin.destroy?.()
  })

  it('destroy 后恢复原始 XHR', () => {
    const ctx = createMockContext('https://monitor.com/api')
    const plugin = httpPlugin()
    plugin.setup(ctx)
    plugin.destroy?.()

    expect(XMLHttpRequest.prototype.open).toBe(originalXhrOpen)
    expect(XMLHttpRequest.prototype.send).toBe(originalXhrSend)
  })
})
