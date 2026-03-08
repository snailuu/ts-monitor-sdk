import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '../../src/core/event-bus'

describe('EventBus', () => {
  it('on + emit 触发回调', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on('test', handler)
    bus.emit('test', 'arg1', 'arg2')
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('同一事件可绑定多个处理器', () => {
    const bus = new EventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('test', h1)
    bus.on('test', h2)
    bus.emit('test')
    expect(h1).toHaveBeenCalledOnce()
    expect(h2).toHaveBeenCalledOnce()
  })

  it('off 取消绑定后不再触发', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on('test', handler)
    bus.off('test', handler)
    bus.emit('test')
    expect(handler).not.toHaveBeenCalled()
  })

  it('emit 不存在的事件不报错', () => {
    const bus = new EventBus()
    expect(() => bus.emit('nonexistent')).not.toThrow()
  })

  it('clear 清除所有事件', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on('a', handler)
    bus.on('b', handler)
    bus.clear()
    bus.emit('a')
    bus.emit('b')
    expect(handler).not.toHaveBeenCalled()
  })
})
