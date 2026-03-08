import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { isNode } from '../utils/env'

export interface NodeHttpPluginOptions {
  /** 需要忽略的 URL 正则列表 */
  ignoreUrls?: RegExp[]
}

/**
 * Node.js HTTP 监控插件
 * 拦截 http.request，自动采集请求 URL、方法、状态码和耗时
 */
export function nodeHttpPlugin(options?: NodeHttpPluginOptions): MonitorPlugin {
  let originalRequest: typeof import('http').request | null = null
  let httpModule: typeof import('http') | null = null

  return {
    name: 'node-http',

    setup(ctx: PluginContext) {
      // 仅在 Node.js 环境下生效
      if (!isNode()) return

      const dsn = ctx.getConfig().dsn
      const ignoreUrls = options?.ignoreUrls ?? []

      try {
        // 动态加载 http 模块并拦截 request 方法
        httpModule = require('http') as typeof import('http')
        originalRequest = httpModule.request

        httpModule.request = function patchedRequest(...args: any[]) {
          const startTime = Date.now()
          const req = originalRequest!.apply(this, args as any)

          // 解析请求 URL 和方法
          let url = ''
          let method = 'GET'
          if (typeof args[0] === 'string') {
            url = args[0]
          }
          else if (args[0] instanceof URL) {
            url = args[0].href
          }
          else if (args[0] && typeof args[0] === 'object') {
            const opts = args[0]
            url = `${opts.protocol || 'http:'}//${opts.hostname || opts.host}${opts.path || '/'}`
            method = opts.method || 'GET'
          }

          // 过滤上报地址和用户配置的忽略列表
          if (url.startsWith(dsn) || ignoreUrls.some(re => re.test(url))) return req

          // 监听响应，上报成功请求数据
          req.on('response', (res: any) => {
            ctx.report({
              type: EventType.HTTP,
              data: {
                url,
                method: method.toUpperCase(),
                status: res.statusCode,
                duration: Date.now() - startTime,
              },
            })
          })

          // 监听错误，上报失败请求数据
          req.on('error', (err: Error) => {
            ctx.report({
              type: EventType.HTTP,
              data: {
                url,
                method: method.toUpperCase(),
                status: 0,
                duration: Date.now() - startTime,
                error: err.message,
              },
            })
          })

          return req
        } as any
      }
      catch {
        /* http 模块不可用时忽略 */
      }
    },

    destroy() {
      // 恢复原始 http.request
      if (httpModule && originalRequest) {
        httpModule.request = originalRequest
        originalRequest = null
        httpModule = null
      }
    },
  }
}
