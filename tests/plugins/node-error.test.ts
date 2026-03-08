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
    const plugin = nodeErrorPlugin({ exitOnError: false })
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
    const plugin = nodeErrorPlugin({ exitOnError: false })
    plugin.setup(ctx)
    plugin.destroy?.()
    expect(spy).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
    expect(spy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
    spy.mockRestore()
  })

  it('exitOnError=true 时触发 process.exit', () => {
    vi.useFakeTimers()
    const ctx = {
      report: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
    }
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const processSpy = vi.spyOn(process, 'on')

    const plugin = nodeErrorPlugin({ exitOnError: true })
    plugin.setup(ctx)

    // 获取注册的 uncaughtException 处理函数并手动调用
    const handler = processSpy.mock.calls.find(c => c[0] === 'uncaughtException')![1] as (err: Error) => void
    handler(new Error('test crash'))

    expect(ctx.report).toHaveBeenCalledTimes(1)
    expect(exitSpy).not.toHaveBeenCalled()

    // 100ms 后应触发 process.exit(1)
    vi.advanceTimersByTime(100)
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
    processSpy.mockRestore()
    vi.useRealTimers()
    plugin.destroy?.()
  })

  it('exitOnError=false 时不触发 process.exit', () => {
    const ctx = {
      report: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
    }
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const processSpy = vi.spyOn(process, 'on')

    const plugin = nodeErrorPlugin({ exitOnError: false })
    plugin.setup(ctx)

    const handler = processSpy.mock.calls.find(c => c[0] === 'uncaughtException')![1] as (err: Error) => void
    handler(new Error('test error'))

    expect(ctx.report).toHaveBeenCalledTimes(1)
    expect(exitSpy).not.toHaveBeenCalled()

    exitSpy.mockRestore()
    processSpy.mockRestore()
    plugin.destroy?.()
  })
})
