import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { isNode } from '../utils/env'

export interface NodeHttpPluginOptions {
  /** 需要忽略的 URL 正则列表 */
  ignoreUrls?: RegExp[]
  /** 自定义 URL 清洗函数，用于去除敏感参数后再上报 */
  sanitizeUrl?: (url: string) => string
}

/**
 * Node.js HTTP 监控插件
 * 拦截 http.request 和 https.request，自动采集请求 URL、方法、状态码和耗时
 */
export function nodeHttpPlugin(options?: NodeHttpPluginOptions): MonitorPlugin {
  let originalHttpRequest: typeof import('http').request | null = null
  let originalHttpsRequest: typeof import('https').request | null = null
  let httpModule: typeof import('http') | null = null
  let httpsModule: typeof import('https') | null = null

  return {
    name: 'node-http',

    setup(ctx: PluginContext) {
      if (!isNode()) return

      const dsn = ctx.getConfig().dsn
      const ignoreUrls = options?.ignoreUrls ?? []
      const sanitizeUrl = options?.sanitizeUrl

      // 创建通用的请求拦截包装函数
      function createPatchedRequest(original: Function, defaultProtocol: string) {
        return function patchedRequest(this: any, ...args: any[]) {
          const startTime = Date.now()
          const req = original.apply(this, args)

          // 解析请求 URL 和方法
          let url = ''
          let method = 'GET'
          const firstArg = args[0]
          const secondArg = args[1]

          if (typeof firstArg === 'string') {
            url = firstArg
          } else if (firstArg instanceof URL) {
            url = firstArg.href
          } else if (firstArg && typeof firstArg === 'object') {
            const opts = firstArg
            url = `${opts.protocol || defaultProtocol}//${opts.hostname || opts.host}${opts.path || '/'}`
            method = opts.method || 'GET'
          }

          // 从第二个参数提取 method（当第一个参数是 string 或 URL 时）
          if (secondArg && typeof secondArg === 'object' && typeof secondArg !== 'function') {
            method = secondArg.method || method
          }

          // 过滤上报地址和用户配置的忽略列表
          if (url.startsWith(dsn) || ignoreUrls.some(re => re.test(url))) return req

          // 应用 URL 清洗函数
          const reportUrl = sanitizeUrl ? sanitizeUrl(url) : url

          req.on('response', (res: any) => {
            ctx.report({
              type: EventType.HTTP,
              data: {
                url: reportUrl,
                method: method.toUpperCase(),
                status: res.statusCode,
                duration: Date.now() - startTime,
              },
            })
          })

          req.on('error', (err: Error) => {
            ctx.report({
              type: EventType.HTTP,
              data: {
                url: reportUrl,
                method: method.toUpperCase(),
                status: 0,
                duration: Date.now() - startTime,
                error: err.message,
              },
            })
          })

          return req
        }
      }

      try {
        // 拦截 http.request
        httpModule = require('http') as typeof import('http')
        originalHttpRequest = httpModule.request
        httpModule.request = createPatchedRequest(originalHttpRequest, 'http:') as any
      } catch {
        /* http 模块不可用时忽略 */
      }

      try {
        // 拦截 https.request
        httpsModule = require('https') as typeof import('https')
        originalHttpsRequest = httpsModule.request
        httpsModule.request = createPatchedRequest(originalHttpsRequest, 'https:') as any
      } catch {
        /* https 模块不可用时忽略 */
      }
    },

    destroy() {
      if (httpModule && originalHttpRequest) {
        httpModule.request = originalHttpRequest
        originalHttpRequest = null
        httpModule = null
      }
      if (httpsModule && originalHttpsRequest) {
        httpsModule.request = originalHttpsRequest
        originalHttpsRequest = null
        httpsModule = null
      }
    },
  }
}
