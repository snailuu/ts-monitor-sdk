import { describe, expect, it } from 'vitest'
import { generateId } from '../../src/utils/id'

describe('generateId', () => {
  it('返回非空字符串', () => {
    expect(generateId()).toBeTruthy()
  })

  it('每次调用返回不同值', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it('长度合理（16-36 字符）', () => {
    const id = generateId()
    expect(id.length).toBeGreaterThanOrEqual(16)
    expect(id.length).toBeLessThanOrEqual(36)
  })
})
