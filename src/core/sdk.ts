import type {
  BeforeReportHook,
  AfterReportHook,
  HookMap,
  MonitorConfig,
  MonitorEvent,
  MonitorPlugin,
  PluginContext,
  ReportData,
  Transport,
} from '../types'
import { EventBus } from './event-bus'
import { BatchTransport } from './transport'
import { generateId } from '../utils/id'
import { getTimestamp } from '../utils/env'

const DEFAULT_CONFIG: Partial<MonitorConfig> = {
  enabled: true,
  sampleRate: 1,
  maxBatchSize: 10,
  flushInterval: 5000,
  maxRetries: 3,
}

export class Monitor {
  private config: MonitorConfig
  private plugins: MonitorPlugin[] = []
  private pluginNames = new Set<string>()
  private eventBus: EventBus
  private batchTransport: BatchTransport
  private hooks: {
    beforeReport: BeforeReportHook[]
    afterReport: AfterReportHook[]
  } = { beforeReport: [], afterReport: [] }

  private started = false
  private pluginCtx: PluginContext | null = null

  constructor(config: MonitorConfig, transport?: Transport) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 校验 sampleRate 范围
    if (this.config.sampleRate !== undefined) {
      this.config.sampleRate = Math.max(0, Math.min(1, this.config.sampleRate))
    }

    this.eventBus = new EventBus()
    this.batchTransport = new BatchTransport(this.config, transport, (events, success) => {
      // afterReport 钩子回调
      for (const hook of this.hooks.afterReport) {
        try {
          hook(events, success)
        }
        catch {
          // 忽略钩子异常
        }
      }
    })
  }

  /** 注册插件 */
  use(plugin: MonitorPlugin): this {
    if (this.pluginNames.has(plugin.name)) {
      throw new Error(`[Monitor] 插件 "${plugin.name}" 已注册，不能重复注册`)
    }
    this.pluginNames.add(plugin.name)
    this.plugins.push(plugin)

    // 如果已启动，立即初始化新插件
    if (this.started && this.pluginCtx) {
      try {
        plugin.setup(this.pluginCtx)
      }
      catch (err) {
        console.error(`[Monitor] 插件 "${plugin.name}" 初始化失败:`, err)
      }
    }

    return this
  }

  /** 注册生命周期钩子 */
  hook<K extends keyof HookMap>(name: K, fn: HookMap[K]): this {
    ;(this.hooks[name] as unknown[]).push(fn)
    return this
  }

  /** 启动 SDK */
  start(): void {
    if (this.started || !this.config.enabled) return
    this.started = true

    this.pluginCtx = this.createPluginContext()
    for (const plugin of this.plugins) {
      try {
        plugin.setup(this.pluginCtx)
      }
      catch (err) {
        console.error(`[Monitor] 插件 "${plugin.name}" 初始化失败:`, err)
      }
    }
  }

  /** 手动上报 */
  report(data: ReportData): void {
    if (!this.started) return
    this.processEvent(data)
  }

  /** 立即刷新缓冲区 */
  async flush(): Promise<void> {
    await this.batchTransport.flush()
  }

  /** 销毁 SDK */
  async destroy(): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        plugin.destroy?.()
      }
      catch {
        // 忽略销毁异常
      }
    }
    this.plugins = []
    this.pluginNames.clear()
    this.pluginCtx = null
    this.eventBus.clear()
    await this.batchTransport.destroy()
    this.started = false
  }

  private createPluginContext(): PluginContext {
    return {
      report: (data: ReportData) => this.processEvent(data),
      on: (event, handler) => this.eventBus.on(event, handler),
      off: (event, handler) => this.eventBus.off(event, handler),
      getConfig: () => Object.freeze({ ...this.config }),
    }
  }

  private processEvent(data: ReportData): void {
    const sampleRate = this.config.sampleRate ?? 1
    if (Math.random() >= sampleRate) return

    let event: MonitorEvent | false = {
      id: generateId(),
      type: data.type,
      timestamp: getTimestamp(),
      data: data.data,
      appId: this.config.appId,
      userId: this.config.userId,
    }

    for (const hook of this.hooks.beforeReport) {
      const result = hook(event as MonitorEvent)
      if (result === false) return
      if (result) event = result
    }

    this.batchTransport.add(event as MonitorEvent)
  }
}

/** 创建 Monitor 实例的工厂函数 */
export function createMonitor(config: MonitorConfig, transport?: Transport): Monitor {
  return new Monitor(config, transport)
}
