import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'

export interface BehaviorPluginOptions {
  /** 是否捕获点击事件，默认 true */
  click?: boolean
  /** 是否捕获路由变化，默认 true */
  routeChange?: boolean
}

/** 用户行为追踪插件，支持点击事件和路由变化监控 */
export function behaviorPlugin(options?: BehaviorPluginOptions): MonitorPlugin {
  const opts = { click: true, routeChange: true, ...options }
  let clickHandler: ((e: MouseEvent) => void) | null = null
  let hashHandler: ((e: HashChangeEvent) => void) | null = null
  let popstateHandler: ((e: PopStateEvent) => void) | null = null

  return {
    name: 'behavior',
    setup(ctx: PluginContext) {
      // 点击事件监听（捕获阶段，确保能捕获所有点击）
      if (opts.click) {
        clickHandler = (e: MouseEvent) => {
          const target = e.target as HTMLElement | null
          if (!target) return
          ctx.report({
            type: EventType.BEHAVIOR,
            data: {
              action: 'click',
              tagName: target.tagName,
              className: target.className || undefined,
              id: target.id || undefined,
              text: target.textContent?.slice(0, 100)?.trim() || undefined,
            },
          })
        }
        document.addEventListener('click', clickHandler, true)
      }

      // 路由变化监听（hashchange + popstate）
      if (opts.routeChange) {
        hashHandler = (e: HashChangeEvent) => {
          ctx.report({
            type: EventType.BEHAVIOR,
            data: { action: 'route-change', from: e.oldURL, to: e.newURL },
          })
        }
        popstateHandler = () => {
          ctx.report({
            type: EventType.BEHAVIOR,
            data: { action: 'route-change', to: location.href },
          })
        }
        window.addEventListener('hashchange', hashHandler)
        window.addEventListener('popstate', popstateHandler)
      }
    },
    destroy() {
      // 移除所有事件监听器
      if (clickHandler) {
        document.removeEventListener('click', clickHandler, true)
        clickHandler = null
      }
      if (hashHandler) {
        window.removeEventListener('hashchange', hashHandler)
        hashHandler = null
      }
      if (popstateHandler) {
        window.removeEventListener('popstate', popstateHandler)
        popstateHandler = null
      }
    },
  }
}
