import { describe, expect, it } from 'vitest'
import { parseStack } from '../../src/utils/stack-parser'

describe('parseStack', () => {
  it('解析 Chrome 风格堆栈', () => {
    const stack = `TypeError: Cannot read property 'x' of undefined
    at foo (http://example.com/app.js:10:15)
    at bar (http://example.com/app.js:20:3)`

    const frames = parseStack(stack)
    expect(frames).toHaveLength(2)
    expect(frames[0]).toEqual({
      func: 'foo',
      file: 'http://example.com/app.js',
      line: 10,
      col: 15,
    })
  })

  it('解析 Node.js 风格堆栈', () => {
    const stack = `Error: something broke
    at Object.<anonymous> (/app/src/index.ts:5:11)
    at Module._compile (node:internal/modules/cjs/loader:1198:14)`

    const frames = parseStack(stack)
    expect(frames.length).toBeGreaterThanOrEqual(1)
    expect(frames[0].file).toBe('/app/src/index.ts')
  })

  it('空字符串返回空数组', () => {
    expect(parseStack('')).toEqual([])
  })

  it('undefined 输入返回空数组', () => {
    expect(parseStack(undefined)).toEqual([])
  })
})
