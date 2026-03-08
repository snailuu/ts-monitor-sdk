import { vi } from 'vitest'
import type { PluginContext, ReportData } from '../src/types'

/** 创建模拟的插件上下文 */
export function createMockContext(dsnOverride?: string): PluginContext & { reported: ReportData[] } {
  const reported: ReportData[] = []
  return {
    reported,
    report: (data: ReportData) => reported.push(data),
    on: vi.fn(),
    off: vi.fn(),
    getConfig: () => ({ dsn: dsnOverride ?? 'https://test.com', appId: 'test' }),
  }
}
