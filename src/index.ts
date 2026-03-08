// 核心类型
export type {
  MonitorConfig,
  MonitorEvent,
  ReportData,
  Breadcrumb,
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
export { BreadcrumbManager } from './core/breadcrumbs'
export { BeaconTransport, FetchTransport, BatchTransport, createTransport } from './core/transport'

// 声明式配置
export { defineConfig, createMonitorFromConfig } from './config'
export type { MonitorFullConfig } from './config'

// 工具函数
export { isBrowser, isNode, getTimestamp } from './utils/env'
export { generateId } from './utils/id'
export { parseStack } from './utils/stack-parser'
export type { StackFrame } from './utils/stack-parser'
