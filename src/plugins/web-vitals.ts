import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'
import { isBrowser } from '../utils/env'

/**
 * Web Vitals 性能指标插件
 * 采集 LCP / FID / CLS / TTFB / INP 五个核心指标
 */
export function webVitalsPlugin(): MonitorPlugin {
  const observers: PerformanceObserver[] = []
  let visibilityHandler: (() => void) | null = null

  return {
    name: 'web-vitals',
    setup(ctx: PluginContext) {
      if (!isBrowser() || typeof PerformanceObserver === 'undefined') return

      let lcpValue = 0
      let clsValue = 0
      let inpValue = 0
      let lcpReported = false
      let fidReported = false

      /** 上报指标 */
      const reportMetric = (name: string, value: number) => {
        ctx.report({
          type: EventType.PERFORMANCE,
          data: { kind: 'web-vitals', name, value },
        })
      }

      // === LCP ===
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const last = entries[entries.length - 1] as any
          if (last) lcpValue = last.startTime
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
        observers.push(lcpObserver)
      }
      catch {
        // 浏览器不支持
      }

      // === FID ===
      try {
        const fidObserver = new PerformanceObserver((list) => {
          if (fidReported) return
          const entry = list.getEntries()[0] as any
          if (entry) {
            fidReported = true
            reportMetric('FID', entry.processingStart - entry.startTime)
          }
        })
        fidObserver.observe({ type: 'first-input', buffered: true })
        observers.push(fidObserver)
      }
      catch {
        // 浏览器不支持
      }

      // === CLS ===
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value ?? 0
            }
          }
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })
        observers.push(clsObserver)
      }
      catch {
        // 浏览器不支持
      }

      // === INP ===
      try {
        const inpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const duration = (entry as any).duration ?? 0
            if (duration > inpValue) inpValue = duration
          }
        })
        inpObserver.observe({ type: 'event', buffered: true })
        observers.push(inpObserver)
      }
      catch {
        // 浏览器不支持
      }

      // === TTFB ===
      try {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
        if (nav) {
          reportMetric('TTFB', nav.responseStart - nav.requestStart)
        }
      }
      catch {
        // 浏览器不支持
      }

      // 页面隐藏时上报 LCP / CLS / INP
      visibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          if (!lcpReported && lcpValue > 0) {
            lcpReported = true
            reportMetric('LCP', lcpValue)
          }
          if (clsValue > 0) {
            reportMetric('CLS', clsValue)
          }
          if (inpValue > 0) {
            reportMetric('INP', inpValue)
          }
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    },
    destroy() {
      for (const observer of observers) {
        try {
          observer.disconnect()
        }
        catch {
          // 忽略
        }
      }
      observers.length = 0
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler)
        visibilityHandler = null
      }
    },
  }
}
