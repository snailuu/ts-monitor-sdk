/** SDK 配置 */
export interface MonitorConfig {
  /** 数据上报地址 */
  dsn: string
  /** 应用标识 */
  appId: string
  /** 用户标识 */
  userId?: string
  /** 是否启用，默认 true */
  enabled?: boolean
  /** 采样率 0-1，默认 1 */
  sampleRate?: number
  /** 批量上报最大条数，默认 10 */
  maxBatchSize?: number
  /** 上报间隔 ms，默认 5000 */
  flushInterval?: number
  /** 最大重试次数，默认 3 */
  maxRetries?: number
  /** 缓冲区最大容量，溢出时丢弃最旧事件，默认 100 */
  maxBufferSize?: number
  /** 面包屑最大数量，默认 20 */
  maxBreadcrumbs?: number
}

/** 事件类型枚举 */
export enum EventType {
  ERROR = 'error',
  PERFORMANCE = 'performance',
  HTTP = 'http',
  BEHAVIOR = 'behavior',
  CUSTOM = 'custom',
}

/** 上报事件数据 */
export interface MonitorEvent {
  /** 唯一 ID */
  id: string
  /** 事件类型 */
  type: EventType | string
  /** 时间戳 */
  timestamp: number
  /** 事件数据 */
  data: Record<string, unknown>
  /** 应用 ID（由 SDK 自动填充） */
  appId?: string
  /** 用户 ID（由 SDK 自动填充） */
  userId?: string
  /** 面包屑列表（错误事件自动附加） */
  breadcrumbs?: Breadcrumb[]
}

/** 面包屑条目 */
export interface Breadcrumb {
  /** 类型：click / route / http / error / custom */
  type: string
  /** 分类 */
  category?: string
  /** 简要描述 */
  message: string
  /** 时间戳 */
  timestamp: number
  /** 附加数据 */
  data?: Record<string, unknown>
}

/** 用户传入的上报数据（不含自动填充字段） */
export interface ReportData {
  type: EventType | string
  data: Record<string, unknown>
}

/** 插件上下文 */
export interface PluginContext {
  /** 上报事件 */
  report: (data: ReportData) => void
  /** 监听内部事件 */
  on: (eventType: string, handler: EventHandler) => void
  /** 取消监听 */
  off: (eventType: string, handler: EventHandler) => void
  /** 获取当前配置 */
  getConfig: () => Readonly<MonitorConfig>
  /** 添加面包屑 */
  addBreadcrumb?: (breadcrumb: Omit<Breadcrumb, 'timestamp'>) => void
  /** 获取当前面包屑列表 */
  getBreadcrumbs?: () => Breadcrumb[]
}

/** 插件接口 */
export interface MonitorPlugin {
  /** 插件名称（唯一标识） */
  name: string
  /** 插件初始化，接收上下文 */
  setup: (ctx: PluginContext) => void
  /** 插件销毁时调用 */
  destroy?: () => void
}

/** 插件工厂函数类型 */
export type PluginFactory<T = unknown> = (options?: T) => MonitorPlugin

/** 事件处理器 */
export type EventHandler = (...args: unknown[]) => void

/** 生命周期钩子类型 */
export type BeforeReportHook = (event: MonitorEvent) => MonitorEvent | false | void
export type AfterReportHook = (events: MonitorEvent[], success: boolean) => void

/** 钩子名称映射 */
export interface HookMap {
  beforeReport: BeforeReportHook
  afterReport: AfterReportHook
}

/** Transport 接口 */
export interface Transport {
  send: (url: string, data: MonitorEvent[]) => Promise<boolean>
}
