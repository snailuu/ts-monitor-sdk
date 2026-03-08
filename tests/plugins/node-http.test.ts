import { describe, expect, it, vi } from 'vitest'
import { nodeHttpPlugin } from '../../src/plugins/node-http'

describe('nodeHttpPlugin', () => {
  it('name 为 "node-http"', () => {
    expect(nodeHttpPlugin().name).toBe('node-http')
  })

  it('setup 和 destroy 不抛错', () => {
    const ctx = {
      report: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getConfig: () => ({ dsn: 'https://test.com', appId: 'test' }),
    }
    const plugin = nodeHttpPlugin()
    expect(() => plugin.setup(ctx)).not.toThrow()
    expect(() => plugin.destroy?.()).not.toThrow()
  })
})
