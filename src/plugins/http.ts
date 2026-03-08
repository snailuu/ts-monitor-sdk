import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'

export interface HttpPluginOptions {
  /** 需要忽略的 URL 正则列表 */
  ignoreUrls?: RegExp[]
  /** 自定义 URL 清洗函数，用于去除敏感参数后再上报 */
  sanitizeUrl?: (url: string) => string
}

/** 判断 URL 是否应跳过上报 */
function shouldIgnore(url: string, dsn: string, ignoreUrls: RegExp[]): boolean {
  return url.startsWith(dsn) || ignoreUrls.some(re => re.test(url))
}

/** 浏览器 HTTP 请求监控插件，通过拦截 fetch 和 XMLHttpRequest 实现 */
export function httpPlugin(options?: HttpPluginOptions): MonitorPlugin {
  let originalFetch: typeof fetch | null = null
  let originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null
  let originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null

  return {
    name: 'http',
    setup(ctx: PluginContext) {
      const dsn = ctx.getConfig().dsn
      const ignoreUrls = options?.ignoreUrls ?? []
      const sanitizeUrl = options?.sanitizeUrl

      // === Fetch 拦截 ===
      originalFetch = globalThis.fetch
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        // 缓存本地引用，防止 destroy() 导致的竞态条件
        const _fetch = originalFetch!
        const url = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
        const method = init?.method?.toUpperCase() ?? 'GET'

        // 跳过上报地址和用户配置的忽略列表
        if (shouldIgnore(url, dsn, ignoreUrls)) {
          return _fetch(input, init)
        }

        // 应用 URL 清洗函数
        const reportUrl = sanitizeUrl ? sanitizeUrl(url) : url
        const startTime = Date.now()
        try {
          const response = await _fetch(input, init)
          const duration = Date.now() - startTime
          ctx.report({
            type: EventType.HTTP,
            data: { url: reportUrl, method, status: response.status, duration },
          })
          ctx.addBreadcrumb?.({ type: 'http', message: `${method} ${reportUrl} ${response.status}` })
          return response
        }
        catch (error) {
          const duration = Date.now() - startTime
          ctx.report({
            type: EventType.HTTP,
            data: {
              url: reportUrl,
              method,
              status: 0,
              duration,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          ctx.addBreadcrumb?.({ type: 'http', message: `${method} ${reportUrl} failed` })
          throw error
        }
      }

      // === XHR 拦截 ===
      originalXhrOpen = XMLHttpRequest.prototype.open
      originalXhrSend = XMLHttpRequest.prototype.send

      XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: unknown[]
      ) {
        // 将 method/url 暂存到实例属性
        ;(this as any).__monitor_method = method.toUpperCase()
        ;(this as any).__monitor_url = typeof url === 'object' ? url.href : url
        return originalXhrOpen!.apply(this, [method, url, ...rest] as any)
      }

      XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
        const method: string = (this as any).__monitor_method ?? 'GET'
        const url: string = (this as any).__monitor_url ?? ''

        // 跳过上报地址和忽略列表
        if (shouldIgnore(url, dsn, ignoreUrls)) {
          return originalXhrSend!.call(this, body)
        }

        const reportUrl = sanitizeUrl ? sanitizeUrl(url) : url
        const startTime = Date.now()

        this.addEventListener('loadend', function () {
          ctx.report({
            type: EventType.HTTP,
            data: {
              url: reportUrl,
              method,
              status: this.status,
              duration: Date.now() - startTime,
            },
          })
          ctx.addBreadcrumb?.({ type: 'http', message: `${method} ${reportUrl} ${this.status}` })
        })

        return originalXhrSend!.call(this, body)
      }
    },
    destroy() {
      // 恢复原始 fetch
      if (originalFetch) {
        globalThis.fetch = originalFetch
        originalFetch = null
      }
      // 恢复原始 XHR 方法
      if (originalXhrOpen) {
        XMLHttpRequest.prototype.open = originalXhrOpen
        originalXhrOpen = null
      }
      if (originalXhrSend) {
        XMLHttpRequest.prototype.send = originalXhrSend
        originalXhrSend = null
      }
    },
  }
}
