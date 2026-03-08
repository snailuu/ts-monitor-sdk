import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'

export interface HttpPluginOptions {
  /** 需要忽略的 URL 正则列表 */
  ignoreUrls?: RegExp[]
}

/** 浏览器 HTTP 请求监控插件，通过拦截 fetch 实现 */
export function httpPlugin(options?: HttpPluginOptions): MonitorPlugin {
  let originalFetch: typeof fetch | null = null

  return {
    name: 'http',
    setup(ctx: PluginContext) {
      const dsn = ctx.getConfig().dsn
      const ignoreUrls = options?.ignoreUrls ?? []

      // 保存原始 fetch 并替换为拦截版本
      originalFetch = globalThis.fetch
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
        const method = init?.method?.toUpperCase() ?? 'GET'

        // 跳过上报地址和用户配置的忽略列表
        if (url.startsWith(dsn) || ignoreUrls.some(re => re.test(url))) {
          return originalFetch!(input, init)
        }

        const startTime = Date.now()
        try {
          const response = await originalFetch!(input, init)
          ctx.report({
            type: EventType.HTTP,
            data: { url, method, status: response.status, duration: Date.now() - startTime },
          })
          return response
        }
        catch (error) {
          ctx.report({
            type: EventType.HTTP,
            data: {
              url,
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
