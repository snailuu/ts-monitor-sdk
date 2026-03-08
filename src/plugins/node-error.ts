import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { parseStack } from '../utils/stack-parser'

export interface NodeErrorPluginOptions {
  /** 是否在未捕获异常后退出进程，默认 true（保持 Node.js 默认行为） */
  exitOnError?: boolean
}

/**
 * Node.js 错误捕获插件
 * 监听 uncaughtException 和 unhandledRejection 事件，自动上报未处理异常
 */
export function nodeErrorPlugin(options?: NodeErrorPluginOptions): MonitorPlugin {
  const exitOnError = options?.exitOnError ?? true
  let uncaughtHandler: ((error: Error) => void) | null = null
  let rejectionHandler: ((reason: unknown) => void) | null = null

  return {
    name: 'node-error',

    setup(ctx: PluginContext) {
      // 捕获未处理的同步异常
      uncaughtHandler = (error: Error) => {
        ctx.report({
          type: EventType.ERROR,
          data: {
            message: error.message,
            stack: parseStack(error.stack),
            errorType: error.name || 'Error',
            source: 'uncaughtException',
          },
        })
        // 上报后退出进程，避免在不一致状态下继续运行
        if (exitOnError) {
          setTimeout(() => process.exit(1), 100)
        }
      }

      // 捕获未处理的 Promise 拒绝
      rejectionHandler = (reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason)
        const stack = reason instanceof Error ? parseStack(reason.stack) : []
        ctx.report({
          type: EventType.ERROR,
          data: {
            message,
            stack,
            errorType: reason instanceof Error ? reason.name : 'UnhandledRejection',
            source: 'unhandledRejection',
          },
        })
      }

      process.on('uncaughtException', uncaughtHandler)
      process.on('unhandledRejection', rejectionHandler)
    },

    destroy() {
      if (uncaughtHandler) {
        process.removeListener('uncaughtException', uncaughtHandler)
        uncaughtHandler = null
      }
      if (rejectionHandler) {
        process.removeListener('unhandledRejection', rejectionHandler)
        rejectionHandler = null
      }
    },
  }
}
