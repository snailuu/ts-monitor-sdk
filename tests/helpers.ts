import { vi } from 'vitest'
import type { Breadcrumb, PluginContext, ReportData } from '../src/types'

/** 创建模拟的插件上下文 */
export function createMockContext(dsnOverride?: string): PluginContext & { reported: ReportData[], breadcrumbs: Breadcrumb[] } {
  const reported: ReportData[] = []
  const breadcrumbs: Breadcrumb[] = []
  return {
    reported,
    breadcrumbs,
    report: (data: ReportData) => reported.push(data),
    on: vi.fn(),
    off: vi.fn(),
    getConfig: () => ({ dsn: dsnOverride ?? 'https://test.com', appId: 'test' }),
    addBreadcrumb: (bc: Omit<Breadcrumb, 'timestamp'>) => breadcrumbs.push({ ...bc, timestamp: Date.now() }),
    getBreadcrumbs: () => [...breadcrumbs],
  }
}
