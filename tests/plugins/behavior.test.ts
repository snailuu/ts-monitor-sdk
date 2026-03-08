import { afterEach, describe, expect, it, vi } from 'vitest'
import { behaviorPlugin } from '../../src/plugins/behavior'
import { EventType } from '../../src/types'
import { createMockContext } from '../helpers'

describe('behaviorPlugin', () => {
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  afterEach(() => {
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
  })
  it('name 为 "behavior"', () => {
    expect(behaviorPlugin().name).toBe('behavior')
  })

  it('捕获点击事件', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ click: true })
    plugin.setup(ctx)

    const btn = document.createElement('button')
    btn.textContent = 'Submit'
    btn.className = 'btn-primary'
    document.body.appendChild(btn)
    btn.click()

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].type).toBe(EventType.BEHAVIOR)
    expect(ctx.reported[0].data.action).toBe('click')
    expect(ctx.reported[0].data.tagName).toBe('BUTTON')

    document.body.removeChild(btn)
    plugin.destroy?.()
  })

  it('click=false 时不捕获点击', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ click: false })
    plugin.setup(ctx)

    document.body.click()

    expect(ctx.reported).toHaveLength(0)
    plugin.destroy?.()
  })

  it('collectText=false 时不采集文本', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ click: true, collectText: false })
    plugin.setup(ctx)

    const btn = document.createElement('button')
    btn.textContent = 'Submit'
    document.body.appendChild(btn)
    btn.click()

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].data.text).toBeUndefined()

    document.body.removeChild(btn)
    plugin.destroy?.()
  })

  it('捕获 hashchange 路由变化', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ routeChange: true })
    plugin.setup(ctx)

    window.dispatchEvent(new HashChangeEvent('hashchange', {
      oldURL: 'http://localhost/#/home',
      newURL: 'http://localhost/#/about',
    }))

    expect(ctx.reported).toHaveLength(1)
    expect(ctx.reported[0].data.action).toBe('route-change')
    plugin.destroy?.()
  })

  it('destroy 后不再捕获事件', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ click: true })
    plugin.setup(ctx)
    plugin.destroy?.()

    document.body.click()

    expect(ctx.reported).toHaveLength(0)
  })

  // === History API 拦截测试 ===

  it('拦截 history.pushState 上报路由变化', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ click: false, routeChange: true })
    plugin.setup(ctx)

    const from = location.href
    history.pushState({}, '', '/new-page')
    const to = location.href

    const routeReports = ctx.reported.filter(r => r.data.action === 'route-change')
    expect(routeReports).toHaveLength(1)
    expect(routeReports[0].data.from).toBe(from)
    expect(routeReports[0].data.to).toBe(to)

    // 恢复 URL
    history.pushState({}, '', '/')
    plugin.destroy?.()
  })

  it('拦截 history.replaceState 上报路由变化', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ click: false, routeChange: true })
    plugin.setup(ctx)

    const from = location.href
    history.replaceState({}, '', '/replaced-page')
    const to = location.href

    const routeReports = ctx.reported.filter(r => r.data.action === 'route-change')
    expect(routeReports).toHaveLength(1)
    expect(routeReports[0].data.from).toBe(from)
    expect(routeReports[0].data.to).toBe(to)

    // 恢复 URL
    history.replaceState({}, '', '/')
    plugin.destroy?.()
  })

  it('pushState URL 未变化时不上报', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ click: false, routeChange: true })
    plugin.setup(ctx)

    // 传入 undefined 作为 url，不改变当前 URL
    history.pushState({}, '')

    const routeReports = ctx.reported.filter(r => r.data.action === 'route-change')
    expect(routeReports).toHaveLength(0)
    plugin.destroy?.()
  })

  it('destroy 后恢复原始 History API', () => {
    const ctx = createMockContext()
    const plugin = behaviorPlugin({ routeChange: true })
    plugin.setup(ctx)
    plugin.destroy?.()

    // pushState 应恢复为原始方法（通过 bind 包装）
    // 验证不再上报
    history.pushState({}, '', '/after-destroy')
    expect(ctx.reported).toHaveLength(0)

    // 恢复 URL
    history.pushState({}, '', '/')
  })
})
