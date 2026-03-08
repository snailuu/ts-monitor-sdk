import type { MonitorConfig, MonitorPlugin, Transport } from './types'
import { Monitor } from './core/sdk'

/** 包含插件的完整配置 */
export interface MonitorFullConfig extends MonitorConfig {
  /** 插件列表 */
  plugins?: MonitorPlugin[]
  /** 自定义 Transport */
  transport?: Transport
}

/** 声明式配置辅助，提供类型提示（运行时透传） */
export function defineConfig(config: MonitorFullConfig): MonitorFullConfig {
  return config
}

/** 根据完整配置创建并初始化 Monitor 实例 */
export function createMonitorFromConfig(config: MonitorFullConfig): Monitor {
  const monitor = new Monitor(config, config.transport)
  if (config.plugins) {
    for (const plugin of config.plugins) {
      monitor.use(plugin)
    }
  }
  return monitor
}
