import type { MonitorConfig, MonitorEvent, Transport } from '../types'
import { isBrowser } from '../utils/env'

/** Beacon API Transport（浏览器端优先） */
export class BeaconTransport implements Transport {
  async send(url: string, data: MonitorEvent[]): Promise<boolean> {
    if (isBrowser() && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      return navigator.sendBeacon(url, blob)
    }
    return new FetchTransport().send(url, data)
  }
}

/** Fetch Transport（通用降级方案） */
export class FetchTransport implements Transport {
  async send(url: string, data: MonitorEvent[]): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.ok
    }
    catch {
      return false
    }
  }
}

/** 批量上报管理器 */
export class BatchTransport {
  private buffer: MonitorEvent[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private destroyed = false
  private config: MonitorConfig
  private transport: Transport

  constructor(config: MonitorConfig, transport?: Transport) {
    this.config = config
    this.transport = transport ?? new BeaconTransport()
    this.startTimer()
  }

  add(event: MonitorEvent): void {
    if (this.destroyed) return
    this.buffer.push(event)

    const maxBatchSize = this.config.maxBatchSize ?? 10
    if (this.buffer.length >= maxBatchSize) {
      void this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const events = this.buffer.splice(0)
    const maxRetries = this.config.maxRetries ?? 3

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const success = await this.transport.send(this.config.dsn, events)
      if (success) return
    }
  }

  destroy(): void {
    this.destroyed = true
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.buffer.length > 0) {
      void this.flush()
    }
  }

  private startTimer(): void {
    const interval = this.config.flushInterval ?? 5000
    this.timer = setInterval(() => {
      void this.flush()
    }, interval)
  }
}

/** 创建默认 Transport */
export function createTransport(): Transport {
  return new BeaconTransport()
}
