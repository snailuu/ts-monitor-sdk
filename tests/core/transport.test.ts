import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BatchTransport } from '../../src/core/transport'
import { EventType } from '../../src/types'
import type { MonitorConfig, MonitorEvent, Transport } from '../../src/types'

function createEvent(overrides?: Partial<MonitorEvent>): MonitorEvent {
  return {
    id: 'test-id',
    type: EventType.ERROR,
    timestamp: Date.now(),
    data: { message: 'test' },
    ...overrides,
  }
}

function createConfig(overrides?: Partial<MonitorConfig>): MonitorConfig {
  return {
    dsn: 'https://example.com/api/report',
    appId: 'test-app',
    maxBatchSize: 3,
    flushInterval: 1000,
    maxRetries: 2,
    ...overrides,
  }
}

describe('BatchTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('缓冲事件直到达到 maxBatchSize 后自动发送', async () => {
    const mockSend = vi.fn().mockResolvedValue(true)
    const transport: Transport = { send: mockSend }
    const batch = new BatchTransport(createConfig(), transport)

    batch.add(createEvent())
    batch.add(createEvent())
    expect(mockSend).not.toHaveBeenCalled()

    batch.add(createEvent())
    await vi.advanceTimersByTimeAsync(0)
    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend.mock.calls[0][1]).toHaveLength(3)

    await batch.destroy()
  })

  it('定时器到期后刷新缓冲区', async () => {
    const mockSend = vi.fn().mockResolvedValue(true)
    const transport: Transport = { send: mockSend }
    const batch = new BatchTransport(createConfig(), transport)

    batch.add(createEvent())
    expect(mockSend).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(mockSend).toHaveBeenCalledOnce()

    await batch.destroy()
  })

  it('flush 立即发送所有缓冲事件', async () => {
    const mockSend = vi.fn().mockResolvedValue(true)
    const transport: Transport = { send: mockSend }
    const batch = new BatchTransport(createConfig(), transport)

    batch.add(createEvent())
    batch.add(createEvent())
    await batch.flush()

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend.mock.calls[0][1]).toHaveLength(2)

    await batch.destroy()
  })

  it('空缓冲区 flush 不调用 send', async () => {
    const mockSend = vi.fn().mockResolvedValue(true)
    const transport: Transport = { send: mockSend }
    const batch = new BatchTransport(createConfig(), transport)

    await batch.flush()
    expect(mockSend).not.toHaveBeenCalled()

    await batch.destroy()
  })

  it('destroy 后不再接受新事件', async () => {
    const mockSend = vi.fn().mockResolvedValue(true)
    const transport: Transport = { send: mockSend }
    const batch = new BatchTransport(createConfig(), transport)

    await batch.destroy()
    batch.add(createEvent())
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('flush 异常时不中断，回调 success=false', async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error('network'))
    const transport: Transport = { send: mockSend }
    const onFlushed = vi.fn()
    const batch = new BatchTransport(createConfig({ maxRetries: 0 }), transport, onFlushed)

    batch.add(createEvent())
    await batch.flush()

    expect(onFlushed).toHaveBeenCalledOnce()
    expect(onFlushed.mock.calls[0][1]).toBe(false)

    await batch.destroy()
  })

  it('onFlushed 回调在成功时 success=true', async () => {
    const mockSend = vi.fn().mockResolvedValue(true)
    const transport: Transport = { send: mockSend }
    const onFlushed = vi.fn()
    const batch = new BatchTransport(createConfig(), transport, onFlushed)

    batch.add(createEvent())
    await batch.flush()

    expect(onFlushed).toHaveBeenCalledOnce()
    expect(onFlushed.mock.calls[0][1]).toBe(true)

    await batch.destroy()
  })

  // === 指数退避重试测试 ===

  it('重试失败时使用指数退避延迟', async () => {
    // 前两次失败，第三次成功
    const mockSend = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const transport: Transport = { send: mockSend }
    const batch = new BatchTransport(createConfig({ maxRetries: 2 }), transport)

    batch.add(createEvent())
    const flushPromise = batch.flush()

    // 第一次重试延迟 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    // 第二次重试延迟 2000ms
    await vi.advanceTimersByTimeAsync(2000)
    await flushPromise

    expect(mockSend).toHaveBeenCalledTimes(3)

    await batch.destroy()
  })

  // === 缓冲区溢出保护测试 ===

  it('缓冲区超过 maxBufferSize 时丢弃最旧事件', async () => {
    const mockSend = vi.fn().mockResolvedValue(true)
    const transport: Transport = { send: mockSend }
    const batch = new BatchTransport(
      createConfig({ maxBufferSize: 5, maxBatchSize: 100 }),
      transport,
    )

    // 添加 7 个事件，maxBufferSize=5，前 2 个应被丢弃
    for (let i = 0; i < 7; i++) {
      batch.add(createEvent({ id: `event-${i}` }))
    }

    await batch.flush()
    expect(mockSend).toHaveBeenCalledOnce()
    const sentEvents = mockSend.mock.calls[0][1]
    expect(sentEvents).toHaveLength(5)
    // 最旧的 event-0 和 event-1 应被丢弃
    expect(sentEvents[0].id).toBe('event-2')
    expect(sentEvents[4].id).toBe('event-6')

    await batch.destroy()
  })
})
