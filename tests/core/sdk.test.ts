import { describe, expect, it, vi } from 'vitest'
import { Monitor } from '../../src/core/sdk'
import { EventType } from '../../src/types'
import type { MonitorPlugin, Transport } from '../../src/types'

function createMockTransport(): Transport {
  return { send: vi.fn().mockResolvedValue(true) }
}

describe('Monitor', () => {
  it('createMonitor 创建实例', () => {
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    expect(monitor).toBeDefined()
    monitor.destroy()
  })

  it('use 注册插件并在 start 时调用 setup', () => {
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

    monitor.destroy()
  })

  it('重复注册同名插件抛出错误', () => {
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
    })
    monitor.use({ name: 'dup', setup: vi.fn() })
    expect(() => monitor.use({ name: 'dup', setup: vi.fn() })).toThrow()
    monitor.destroy()
  })

  it('hook beforeReport 可过滤事件（返回 false）', () => {
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', maxBatchSize: 1 },
      transport,
    )

    monitor.hook('beforeReport', () => false)
    monitor.start()
    monitor.report({ type: EventType.ERROR, data: { msg: 'blocked' } })

    expect(transport.send).not.toHaveBeenCalled()
    monitor.destroy()
  })

  it('hook beforeReport 可修改事件', () => {
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

    monitor.destroy()
  })

  it('sampleRate=0 时所有事件被过滤', () => {
    const transport = createMockTransport()
    const monitor = new Monitor(
      { dsn: 'https://example.com/api', appId: 'test', sampleRate: 0, maxBatchSize: 1 },
      transport,
    )
    monitor.start()
    monitor.report({ type: EventType.ERROR, data: {} })
    expect(transport.send).not.toHaveBeenCalled()
    monitor.destroy()
  })

  it('destroy 调用所有插件的 destroy', () => {
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
    monitor.destroy()
    expect(destroyFn).toHaveBeenCalledOnce()
  })

  it('enabled=false 时不启动插件', () => {
    const setup = vi.fn()
    const monitor = new Monitor({
      dsn: 'https://example.com/api',
      appId: 'test',
      enabled: false,
    })
    monitor.use({ name: 'test', setup })
    monitor.start()
    expect(setup).not.toHaveBeenCalled()
    monitor.destroy()
  })
})
