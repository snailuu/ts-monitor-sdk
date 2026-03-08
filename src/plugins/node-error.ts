import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { parseStack } from '../utils/stack-parser'

/**
 * Node.js 错误捕获插件
 * 监听 uncaughtException 和 unhandledRejection 事件，自动上报未处理异常
 */
export function nodeErrorPlugin(): MonitorPlugin {
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
