import type { MonitorPlugin, PluginContext } from '../types'
import { EventType } from '../types'

export interface BehaviorPluginOptions {
  /** 是否捕获点击事件，默认 true */
  click?: boolean
  /** 是否捕获路由变化，默认 true */
  routeChange?: boolean
  /** 是否采集点击元素的文本内容，默认 true（可关闭以避免 PII 泄露） */
  collectText?: boolean
  /** 采集文本的最大长度，默认 50 */
  maxTextLength?: number
}

/** 用户行为追踪插件，支持点击事件和路由变化监控 */
export function behaviorPlugin(options?: BehaviorPluginOptions): MonitorPlugin {
  const opts = { click: true, routeChange: true, collectText: true, maxTextLength: 50, ...options }
  let clickHandler: ((e: MouseEvent) => void) | null = null
  let hashHandler: ((e: HashChangeEvent) => void) | null = null
  let popstateHandler: ((e: PopStateEvent) => void) | null = null
  let originalPushState: typeof history.pushState | null = null
  let originalReplaceState: typeof history.replaceState | null = null

  return {
    name: 'behavior',
    setup(ctx: PluginContext) {
      // 点击事件监听（捕获阶段，确保能捕获所有点击）
      if (opts.click) {
        clickHandler = (e: MouseEvent) => {
          const target = e.target as HTMLElement | null
          if (!target) return
          const data: Record<string, unknown> = {
            action: 'click',
            tagName: target.tagName,
            className: target.className || undefined,
            id: target.id || undefined,
          }
          // 仅在启用时采集文本，使用直接子文本节点避免深层遍历捕获敏感信息
          if (opts.collectText) {
            const ownText = Array.from(target.childNodes)
              .filter(n => n.nodeType === Node.TEXT_NODE)
              .map(n => n.textContent ?? '')
              .join('')
              .trim()
              .slice(0, opts.maxTextLength)
            if (ownText) data.text = ownText
          }
          ctx.report({ type: EventType.BEHAVIOR, data })
          // 推送面包屑
          ctx.addBreadcrumb?.({ type: 'click', message: `${target.tagName}${target.id ? '#' + target.id : ''}` })
        }
        document.addEventListener('click', clickHandler, true)
      }

      // 路由变化监听（hashchange + popstate + History API）
      if (opts.routeChange) {
        hashHandler = (e: HashChangeEvent) => {
          ctx.report({
            type: EventType.BEHAVIOR,
            data: { action: 'route-change', from: e.oldURL, to: e.newURL },
          })
          ctx.addBreadcrumb?.({ type: 'route', message: `${e.oldURL} → ${e.newURL}` })
        }
        popstateHandler = () => {
          ctx.report({
            type: EventType.BEHAVIOR,
            data: { action: 'route-change', to: location.href },
          })
          ctx.addBreadcrumb?.({ type: 'route', message: location.href })
        }
        window.addEventListener('hashchange', hashHandler)
        window.addEventListener('popstate', popstateHandler)

        // History API 拦截（pushState / replaceState）
        originalPushState = history.pushState.bind(history)
        originalReplaceState = history.replaceState.bind(history)

        history.pushState = function (state: any, unused: string, url?: string | URL | null) {
          const from = location.href
          originalPushState!(state, unused, url)
          const to = location.href
          if (from !== to) {
            ctx.report({
              type: EventType.BEHAVIOR,
              data: { action: 'route-change', from, to },
            })
            ctx.addBreadcrumb?.({ type: 'route', message: `${from} → ${to}` })
          }
        }

        history.replaceState = function (state: any, unused: string, url?: string | URL | null) {
          const from = location.href
          originalReplaceState!(state, unused, url)
          const to = location.href
          if (from !== to) {
            ctx.report({
              type: EventType.BEHAVIOR,
              data: { action: 'route-change', from, to },
            })
            ctx.addBreadcrumb?.({ type: 'route', message: `${from} → ${to}` })
          }
        }
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
      // 恢复原始 History API
      if (originalPushState) {
        history.pushState = originalPushState
        originalPushState = null
      }
      if (originalReplaceState) {
        history.replaceState = originalReplaceState
        originalReplaceState = null
      }
    },
  }
}
