import { describe, expect, it, vi } from 'vitest'
import { nodeErrorPlugin } from '../../src/plugins/node-error'

describe('nodeErrorPlugin', () => {
  it('name 为 "node-error"', () => {
    expect(nodeErrorPlugin().name).toBe('node-error')
  })

  it('setup 注册 process 事件监听器', () => {
    const ctx = {
      report: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
    }
    const spy = vi.spyOn(process, 'on')
    const plugin = nodeErrorPlugin()
    plugin.setup(ctx)
    expect(spy).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
    expect(spy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
    spy.mockRestore()
    plugin.destroy?.()
  })

  it('destroy 移除 process 事件监听器', () => {
    const ctx = {
      report: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
    }
    const spy = vi.spyOn(process, 'removeListener')
    const plugin = nodeErrorPlugin()
    plugin.setup(ctx)
    plugin.destroy?.()
    expect(spy).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
    expect(spy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
    spy.mockRestore()
  })
})
