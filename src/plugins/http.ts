import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'

export interface HttpPluginOptions {
  /** 需要忽略的 URL 正则列表 */
  ignoreUrls?: RegExp[]
  /** 自定义 URL 清洗函数，用于去除敏感参数后再上报 */
  sanitizeUrl?: (url: string) => string
}

/** 浏览器 HTTP 请求监控插件，通过拦截 fetch 实现 */
export function httpPlugin(options?: HttpPluginOptions): MonitorPlugin {
  let originalFetch: typeof fetch | null = null

  return {
    name: 'http',
    setup(ctx: PluginContext) {
      const dsn = ctx.getConfig().dsn
      const ignoreUrls = options?.ignoreUrls ?? []
      const sanitizeUrl = options?.sanitizeUrl

      // 保存原始 fetch 并替换为拦截版本
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
        if (url.startsWith(dsn) || ignoreUrls.some(re => re.test(url))) {
          return _fetch(input, init)
        }

        // 应用 URL 清洗函数
        const reportUrl = sanitizeUrl ? sanitizeUrl(url) : url
        const startTime = Date.now()
        try {
          const response = await _fetch(input, init)
          ctx.report({
            type: EventType.HTTP,
            data: { url: reportUrl, method, status: response.status, duration: Date.now() - startTime },
          })
          return response
        }
        catch (error) {
          ctx.report({
            type: EventType.HTTP,
            data: {
              url: reportUrl,
              method,
              status: 0,
              duration: Date.now() - startTime,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          throw error
        }
      }
    },
    destroy() {
      // 恢复原始 fetch
      if (originalFetch) {
        globalThis.fetch = originalFetch
        originalFetch = null
      }
    },
  }
}
