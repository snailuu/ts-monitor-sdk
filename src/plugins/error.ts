import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { parseStack } from '../utils/stack-parser'

/**
 * 浏览器 JS 错误捕获插件
 * 监听 window.onerror 和 unhandledrejection 事件
 */
export function errorPlugin(): MonitorPlugin {
  let errorHandler: ((event: ErrorEvent) => void) | null = null
  let rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null

  return {
    name: 'error',
    setup(ctx: PluginContext) {
      // 捕获同步 JS 错误
      errorHandler = (event: ErrorEvent) => {
        const { message, filename, lineno, colno, error } = event
        ctx.report({
          type: EventType.ERROR,
          data: {
            message,
            filename,
            lineno,
            colno,
            stack: parseStack(error?.stack),
            errorType: error?.name || 'Error',
          },
        })
      }

      // 捕获未处理的 Promise 拒绝
      rejectionHandler = (event: PromiseRejectionEvent) => {
        const reason = event.reason
        const message = reason instanceof Error ? reason.message : String(reason)
        const stack = reason instanceof Error ? parseStack(reason.stack) : []
        ctx.report({
          type: EventType.ERROR,
          data: {
            message,
            stack,
            errorType: reason?.name || 'UnhandledRejection',
          },
        })
      }

      window.addEventListener('error', errorHandler)
      window.addEventListener('unhandledrejection', rejectionHandler)
    },
    destroy() {
      if (errorHandler) {
        window.removeEventListener('error', errorHandler)
        errorHandler = null
      }
      if (rejectionHandler) {
        window.removeEventListener('unhandledrejection', rejectionHandler)
        rejectionHandler = null
      }
    },
  }
}
