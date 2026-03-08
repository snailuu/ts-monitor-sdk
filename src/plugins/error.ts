import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { parseStack } from '../utils/stack-parser'

/** 需要监控的资源标签白名单 */
const RESOURCE_TAGS = new Set(['IMG', 'SCRIPT', 'LINK', 'AUDIO', 'VIDEO'])

/** 错误插件配置 */
export interface ErrorPluginOptions {
  /** 是否启用错误去重，默认 true */
  deduplicate?: boolean
  /** 同一错误最大重复次数，超过后丢弃，默认 5 */
  maxDuplicates?: number
}

/** 生成错误指纹用于去重 */
function getErrorHash(data: Record<string, unknown>): string {
  return `${data.message ?? ''}|${data.filename ?? ''}|${data.lineno ?? ''}|${data.colno ?? ''}`
}

/**
 * 浏览器 JS 错误捕获插件
 * 监听 window.onerror、unhandledrejection 和资源加载错误
 */
export function errorPlugin(options?: ErrorPluginOptions): MonitorPlugin {
  const deduplicate = options?.deduplicate ?? true
  const maxDuplicates = options?.maxDuplicates ?? 5
  const errorCounts = new Map<string, number>()

  let errorHandler: ((event: ErrorEvent) => void) | null = null
  let rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null
  let resourceHandler: ((event: Event) => void) | null = null

  return {
    name: 'error',
    setup(ctx: PluginContext) {
      // 捕获同步 JS 错误
      errorHandler = (event: ErrorEvent) => {
        const { message, filename, lineno, colno, error } = event
        const data: Record<string, unknown> = {
          message,
          filename,
          lineno,
          colno,
          stack: parseStack(error?.stack),
          errorType: error?.name || 'Error',
        }

        // 错误去重
        if (deduplicate) {
          const hash = getErrorHash(data)
          const count = (errorCounts.get(hash) ?? 0) + 1
          errorCounts.set(hash, count)
          if (count > maxDuplicates) return
        }

        // 推送面包屑
        ctx.addBreadcrumb?.({ type: 'error', message: String(message) })

        ctx.report({ type: EventType.ERROR, data })
      }

      // 捕获未处理的 Promise 拒绝
      rejectionHandler = (event: PromiseRejectionEvent) => {
        const reason = event.reason
        const message = reason instanceof Error ? reason.message : String(reason)
        const stack = reason instanceof Error ? parseStack(reason.stack) : []

        // 推送面包屑
        ctx.addBreadcrumb?.({ type: 'error', message })

        ctx.report({
          type: EventType.ERROR,
          data: {
            message,
            stack,
            errorType: reason?.name || 'UnhandledRejection',
          },
        })
      }

      // 捕获资源加载错误（捕获阶段，区分 JS 错误和资源错误）
      resourceHandler = (event: Event) => {
        const target = event.target as HTMLElement | null
        // 仅处理 HTMLElement 且在白名单中的资源标签，排除 JS 运行时错误
        if (!target || !(target instanceof HTMLElement)) return
        if (!RESOURCE_TAGS.has(target.tagName)) return

        const src = (target as HTMLImageElement | HTMLScriptElement).src
          || (target as HTMLLinkElement).href
          || ''

        // 推送面包屑
        ctx.addBreadcrumb?.({ type: 'error', message: `Resource load failed: ${target.tagName} ${src}` })

        ctx.report({
          type: EventType.ERROR,
          data: {
            errorType: 'ResourceError',
            tagName: target.tagName,
            src,
          },
        })
      }

      window.addEventListener('error', errorHandler)
      window.addEventListener('unhandledrejection', rejectionHandler)
      // 资源错误只能在捕获阶段监听到
      window.addEventListener('error', resourceHandler, true)
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
      if (resourceHandler) {
        window.removeEventListener('error', resourceHandler, true)
        resourceHandler = null
      }
      errorCounts.clear()
    },
  }
}
