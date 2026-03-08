import { describe, expect, it, vi } from 'vitest'
import { Monitor } from '../../src/core/sdk'
import { EventType } from '../../src/types'
import type { MonitorPlugin, Transport } from '../../src/types'

function createMockTransport(): Transport {
  return { send: vi.fn().mockResolvedValue(true) }
}

describe('Monitor', () => {
  it('createMonitor 创建实例', async () => {
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    expect(monitor).toBeDefined()
    await monitor.destroy()
  })

  it('use 注册插件并在 start 时调用 setup', async () => {
    const setup = vi.fn()
    const plugin: MonitorPlugin = { name: 'test-plugin', setup }

    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    monitor.use(plugin)
    monitor.start()

    expect(setup).toHaveBeenCalledOnce()
    expect(setup.mock.calls[0][0]).toHaveProperty('report')
    expect(setup.mock.calls[0][0]).toHaveProperty('on')
    expect(setup.mock.calls[0][0]).toHaveProperty('off')
    expect(setup.mock.calls[0][0]).toHaveProperty('getConfig')

    await monitor.destroy()
  })

  it('start 后调用 use 立即初始化插件', async () => {
    const setup = vi.fn()
    const plugin: MonitorPlugin = { name: 'late-plugin', setup }

    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    monitor.start()
    monitor.use(plugin)

    expect(setup).toHaveBeenCalledOnce()
    await monitor.destroy()
  })

  it('重复注册同名插件抛出错误', async () => {
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    monitor.use({ name: 'dup', setup: vi.fn() })
    expect(() => monitor.use({ name: 'dup', setup: vi.fn() })).toThrow()
    await monitor.destroy()
  })

  it('hook beforeReport 可过滤事件（返回 false）', async () => {
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 1 },
      transport,
    )

    monitor.hook('beforeReport', () => false)
    monitor.start()
    monitor.report({ type: EventType.ERROR, data: { msg: 'blocked' } })

    expect(transport.send).not.toHaveBeenCalled()
    await monitor.destroy()
  })

  it('hook beforeReport 可修改事件', async () => {
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 1 },
      transport,
    )

    monitor.hook('beforeReport', (event) => {
      return { ...event, data: { ...event.data, injected: true } }
    })
    monitor.start()
    monitor.report({ type: EventType.CUSTOM, data: { original: true } })

    expect(transport.send).toHaveBeenCalled()
    const sentEvents = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(sentEvents[0].data.injected).toBe(true)

    await monitor.destroy()
  })

  it('hook afterReport 在上报完成后调用', async () => {
    vi.useFakeTimers()
    const afterHook = vi.fn()
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 1 },
      transport,
    )

    monitor.hook('afterReport', afterHook)
    monitor.start()
    monitor.report({ type: EventType.ERROR, data: { msg: 'test' } })

    // flush 是异步的，需要等待
    await vi.advanceTimersByTimeAsync(0)

    expect(afterHook).toHaveBeenCalledOnce()
    expect(afterHook.mock.calls[0][1]).toBe(true) // success

    vi.useRealTimers()
    await monitor.destroy()
  })

  it('sampleRate=0 时所有事件被过滤', async () => {
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', sampleRate: 0, maxBatchSize: 1 },
      transport,
    )
    monitor.start()
    monitor.report({ type: EventType.ERROR, data: {} })
    expect(transport.send).not.toHaveBeenCalled()
    await monitor.destroy()
  })

  it('sampleRate 超出范围被 clamp', async () => {
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', sampleRate: 2, maxBatchSize: 1 },
      transport,
    )
    monitor.start()
    // sampleRate=2 被 clamp 到 1，所有事件都应通过
    monitor.report({ type: EventType.ERROR, data: {} })
    expect(transport.send).toHaveBeenCalled()
    await monitor.destroy()
  })

  it('destroy 调用所有插件的 destroy', async () => {
    const destroyFn = vi.fn()
    const plugin: MonitorPlugin = {
      name: 'test',
      setup: vi.fn(),
      destroy: destroyFn,
    }
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    monitor.use(plugin)
    monitor.start()
    await monitor.destroy()
    expect(destroyFn).toHaveBeenCalledOnce()
  })

  it('enabled=false 时不启动插件', async () => {
    const setup = vi.fn()
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
      enabled: false,
    })
    monitor.use({ name: 'test', setup })
    monitor.start()
    expect(setup).not.toHaveBeenCalled()
    await monitor.destroy()
  })

  // === 页面生命周期 flush 测试 ===

  it('visibilitychange hidden 时触发 flush', async () => {
    vi.useFakeTimers()
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 100 },
      transport,
    )
    monitor.start()
    monitor.report({ type: EventType.ERROR, data: { msg: 'test' } })

    // 模拟页面隐藏
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    await vi.advanceTimersByTimeAsync(0)
    expect(transport.send).toHaveBeenCalled()

    // 恢复
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    vi.useRealTimers()
    await monitor.destroy()
  })

  it('beforeunload 时触发 flush', async () => {
    vi.useFakeTimers()
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 100 },
      transport,
    )
    monitor.start()
    monitor.report({ type: EventType.ERROR, data: { msg: 'test' } })

    window.dispatchEvent(new Event('beforeunload'))

    await vi.advanceTimersByTimeAsync(0)
    expect(transport.send).toHaveBeenCalled()

    vi.useRealTimers()
    await monitor.destroy()
  })

  // === 面包屑集成测试 ===

  it('pluginCtx 提供 addBreadcrumb 和 getBreadcrumbs', async () => {
    let ctx: any = null
    const plugin = {
      name: 'bc-test',
      setup(c: any) { ctx = c },
    }
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    monitor.use(plugin)
    monitor.start()

    expect(ctx.addBreadcrumb).toBeTypeOf('function')
    expect(ctx.getBreadcrumbs).toBeTypeOf('function')

    ctx.addBreadcrumb({ type: 'click', message: 'btn' })
    const crumbs = ctx.getBreadcrumbs()
    expect(crumbs).toHaveLength(1)
    expect(crumbs[0].type).toBe('click')

    await monitor.destroy()
  })

  it('ERROR 事件自动附加面包屑', async () => {
    vi.useFakeTimers()
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 1 },
      transport,
    )

    let ctx: any = null
    monitor.use({
      name: 'bc-inject',
      setup(c) { ctx = c },
    })
    monitor.start()

    // 先添加一些面包屑
    ctx.addBreadcrumb({ type: 'click', message: 'button' })
    ctx.addBreadcrumb({ type: 'route', message: '/home' })

    // 上报 ERROR 事件
    monitor.report({ type: EventType.ERROR, data: { msg: 'test' } })
    await vi.advanceTimersByTimeAsync(0)

    expect(transport.send).toHaveBeenCalled()
    const sentEvents = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(sentEvents[0].breadcrumbs).toHaveLength(2)
    expect(sentEvents[0].breadcrumbs[0].type).toBe('click')

    vi.useRealTimers()
    await monitor.destroy()
  })

  it('非 ERROR 事件不附加面包屑', async () => {
    vi.useFakeTimers()
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 1 },
      transport,
    )

    let ctx: any = null
    monitor.use({
      name: 'bc-noattach',
      setup(c) { ctx = c },
    })
    monitor.start()

    ctx.addBreadcrumb({ type: 'click', message: 'button' })
    monitor.report({ type: EventType.HTTP, data: { url: '/api' } })
    await vi.advanceTimersByTimeAsync(0)

    const sentEvents = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(sentEvents[0].breadcrumbs).toBeUndefined()

    vi.useRealTimers()
    await monitor.destroy()
  })
})
