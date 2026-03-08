import { describe, expect, it, vi } from 'vitest'
import { behaviorPlugin } from '../../src/plugins/behavior'
import { EventType } from '../../src/types'
import { createMockContext } from '../helpers'

describe('behaviorPlugin', () => {
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
})
