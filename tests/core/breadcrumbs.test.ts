import { describe, expect, it } from 'vitest'
import { BreadcrumbManager } from '../../src/core/breadcrumbs'

describe('BreadcrumbManager', () => {
  it('添加面包屑并获取', () => {
    const mgr = new BreadcrumbManager()
    mgr.add({ type: 'click', message: 'button' })
    mgr.add({ type: 'route', message: '/home → /about' })

    const all = mgr.getAll()
    expect(all).toHaveLength(2)
    expect(all[0].type).toBe('click')
    expect(all[0].message).toBe('button')
    expect(all[0].timestamp).toBeTypeOf('number')
    expect(all[1].type).toBe('route')
  })

  it('超过 maxSize 时丢弃最旧条目', () => {
    const mgr = new BreadcrumbManager(3)
    mgr.add({ type: 'a', message: '1' })
    mgr.add({ type: 'b', message: '2' })
    mgr.add({ type: 'c', message: '3' })
    mgr.add({ type: 'd', message: '4' })

    const all = mgr.getAll()
    expect(all).toHaveLength(3)
    expect(all[0].message).toBe('2')
    expect(all[2].message).toBe('4')
  })

  it('getAll 返回副本', () => {
    const mgr = new BreadcrumbManager()
    mgr.add({ type: 'test', message: 'msg' })
    const copy = mgr.getAll()
    copy.push({ type: 'fake', message: 'injected', timestamp: 0 })
    expect(mgr.getAll()).toHaveLength(1)
  })

  it('clear 清空所有面包屑', () => {
    const mgr = new BreadcrumbManager()
    mgr.add({ type: 'test', message: 'msg' })
    mgr.clear()
    expect(mgr.getAll()).toHaveLength(0)
  })

  it('默认 maxSize 为 20', () => {
    const mgr = new BreadcrumbManager()
    for (let i = 0; i < 25; i++) {
      mgr.add({ type: 'test', message: `${i}` })
    }
    expect(mgr.getAll()).toHaveLength(20)
  })
})
