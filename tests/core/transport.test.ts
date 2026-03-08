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
})
