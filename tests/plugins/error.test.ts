import { describe, expect, it, vi } from 'vitest'
import { errorPlugin } from '../../src/plugins/error'
import { EventType } from '../../src/types'
import { createMockContext } from '../helpers'

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

  // === 资源加载错误测试 ===

  it('捕获资源加载错误（img）', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin()
    plugin.setup(ctx)

    // 模拟 img 资源加载失败：在捕获阶段触发
    const img = document.createElement('img')
    img.src = 'https://cdn.example.com/missing.png'
    document.body.appendChild(img)

    // 模拟资源错误事件（捕获阶段冒泡到 window）
    const event = new Event('error', { bubbles: false, cancelable: false })
    Object.defineProperty(event, 'target', { value: img })
    window.dispatchEvent(event)

    // resourceHandler 通过捕获阶段监听，应该上报
    const resourceReports = ctx.reported.filter(r => r.data.errorType === 'ResourceError')
    expect(resourceReports).toHaveLength(1)
    expect(resourceReports[0].data.tagName).toBe('IMG')
    expect(resourceReports[0].data.src).toBe('https://cdn.example.com/missing.png')

    document.body.removeChild(img)
    plugin.destroy?.()
  })

  it('捕获 script 资源加载错误', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin()
    plugin.setup(ctx)

    const script = document.createElement('script')
    script.src = 'https://cdn.example.com/missing.js'
    document.body.appendChild(script)

    const event = new Event('error', { bubbles: false, cancelable: false })
    Object.defineProperty(event, 'target', { value: script })
    window.dispatchEvent(event)

    const resourceReports = ctx.reported.filter(r => r.data.errorType === 'ResourceError')
    expect(resourceReports).toHaveLength(1)
    expect(resourceReports[0].data.tagName).toBe('SCRIPT')

    document.body.removeChild(script)
    plugin.destroy?.()
  })

  it('不捕获非白名单标签的错误', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin()
    plugin.setup(ctx)

    const div = document.createElement('div')
    const event = new Event('error', { bubbles: false, cancelable: false })
    Object.defineProperty(event, 'target', { value: div })
    window.dispatchEvent(event)

    const resourceReports = ctx.reported.filter(r => r.data.errorType === 'ResourceError')
    expect(resourceReports).toHaveLength(0)
    plugin.destroy?.()
  })

  // === 错误去重测试 ===

  it('默认去重：超过 maxDuplicates 后丢弃', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin({ maxDuplicates: 2 })
    plugin.setup(ctx)

    // 同一错误触发 3 次，应只上报 2 次
    for (let i = 0; i < 3; i++) {
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'dup error',
          filename: 'app.js',
          lineno: 1,
          colno: 1,
          error: new Error('dup error'),
        }),
      )
    }

    // 只过滤非 ResourceError 的上报
    const jsErrors = ctx.reported.filter(r => r.data.errorType !== 'ResourceError')
    expect(jsErrors).toHaveLength(2)
    plugin.destroy?.()
  })

  it('deduplicate=false 时不去重', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin({ deduplicate: false })
    plugin.setup(ctx)

    for (let i = 0; i < 10; i++) {
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'repeat',
          filename: 'app.js',
          lineno: 1,
          colno: 1,
          error: new Error('repeat'),
        }),
      )
    }

    const jsErrors = ctx.reported.filter(r => r.data.errorType !== 'ResourceError')
    expect(jsErrors).toHaveLength(10)
    plugin.destroy?.()
  })

  it('不同错误分别计数', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin({ maxDuplicates: 1 })
    plugin.setup(ctx)

    // 错误 A 触发 2 次
    for (let i = 0; i < 2; i++) {
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'error-a',
          filename: 'a.js',
          lineno: 1,
          colno: 1,
          error: new Error('error-a'),
        }),
      )
    }
    // 错误 B 触发 2 次
    for (let i = 0; i < 2; i++) {
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'error-b',
          filename: 'b.js',
          lineno: 2,
          colno: 2,
          error: new Error('error-b'),
        }),
      )
    }

    const jsErrors = ctx.reported.filter(r => r.data.errorType !== 'ResourceError')
    // 每种错误各上报 1 次
    expect(jsErrors).toHaveLength(2)
    plugin.destroy?.()
  })

  // === 面包屑推送测试 ===

  it('错误发生时推送面包屑', () => {
    const ctx = createMockContext()
    const plugin = errorPlugin()
    plugin.setup(ctx)

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'bc error',
        filename: 'app.js',
        lineno: 10,
        colno: 5,
        error: new Error('bc error'),
      }),
    )

    expect(ctx.breadcrumbs).toHaveLength(1)
    expect(ctx.breadcrumbs[0].type).toBe('error')
    expect(ctx.breadcrumbs[0].message).toBe('bc error')
    plugin.destroy?.()
  })
})
