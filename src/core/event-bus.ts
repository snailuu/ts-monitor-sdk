import type { EventHandler } from '../types'

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args)
      }
      catch {
        // 插件异常不应影响 SDK 运行
      }
    })
  }

  clear(): void {
    this.listeners.clear()
  }
}
