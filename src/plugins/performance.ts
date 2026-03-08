import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { isBrowser } from '../utils/env'

export interface PerformancePluginOptions {
  /** 是否采集资源加载性能，默认 false */
  resource?: boolean
}

/**
 * 性能监控插件
 * 采集 Navigation Timing 和 Paint 指标
 */
export function performancePlugin(options?: PerformancePluginOptions): MonitorPlugin {
  let observer: PerformanceObserver | null = null
  let reportNavigation: (() => void) | null = null

  return {
    name: 'performance',
    setup(ctx: PluginContext) {
      if (!isBrowser() || typeof PerformanceObserver === 'undefined') return

      // 上报页面导航性能指标
      reportNavigation = () => {
        const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        if (!navigation) return
        ctx.report({
          type: EventType.PERFORMANCE,
          data: {
            kind: 'navigation',
            dns: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcp: navigation.connectEnd - navigation.connectStart,
            ttfb: navigation.responseStart - navigation.requestStart,
            domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            load: navigation.loadEventEnd - navigation.fetchStart,
            domParse: navigation.domInteractive - navigation.responseEnd,
          },
        })
      }

      // 页面已加载完成则立即上报，否则等待 load 事件
      if (document.readyState === 'complete') {
        reportNavigation()
      } else {
        window.addEventListener('load', () => {
          setTimeout(() => reportNavigation?.(), 0)
        })
      }

      // 观察 Paint 指标（FP / FCP）
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              ctx.report({
                type: EventType.PERFORMANCE,
                data: {
                  kind: 'paint',
                  name: entry.name,
                  startTime: entry.startTime,
                },
              })
            }
          }
        })
        observer.observe({ type: 'paint', buffered: true })
      } catch {
        /* PerformanceObserver 不可用时忽略 */
      }
    },
    destroy() {
      observer?.disconnect()
      observer = null
      reportNavigation = null
    },
  }
}
