// 核心类型
export type {
  MonitorConfig,
  MonitorEvent,
  ReportData,
  PluginContext,
  MonitorPlugin,
  PluginFactory,
  EventHandler,
  BeforeReportHook,
  AfterReportHook,
  HookMap,
  Transport,
} from './types'

export { EventType } from './types'

// SDK 核心
export { Monitor, createMonitor } from './core/sdk'
export { EventBus } from './core/event-bus'
export { BeaconTransport, FetchTransport, BatchTransport, createTransport } from './core/transport'

// 浏览器插件
export { errorPlugin } from './plugins/error'
export { performancePlugin } from './plugins/performance'
export type { PerformancePluginOptions } from './plugins/performance'
export { httpPlugin } from './plugins/http'
export type { HttpPluginOptions } from './plugins/http'
export { behaviorPlugin } from './plugins/behavior'
export type { BehaviorPluginOptions } from './plugins/behavior'

// Node.js 插件
export { nodeErrorPlugin } from './plugins/node-error'
export type { NodeErrorPluginOptions } from './plugins/node-error'
export { nodeHttpPlugin } from './plugins/node-http'
export type { NodeHttpPluginOptions } from './plugins/node-http'

// 工具函数
export { isBrowser, isNode, getTimestamp } from './utils/env'
export { generateId } from './utils/id'
export { parseStack } from './utils/stack-parser'
export type { StackFrame } from './utils/stack-parser'
