import type { Breadcrumb } from '../types'
import { getTimestamp } from '../utils/env'

/** 面包屑管理器，使用环形缓冲区记录用户操作轨迹 */
export class BreadcrumbManager {
  private buffer: Breadcrumb[] = []
  private maxSize: number

  constructor(maxSize = 20) {
    this.maxSize = maxSize
  }

  /** 添加面包屑，自动填充时间戳 */
  add(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const entry: Breadcrumb = { ...breadcrumb, timestamp: getTimestamp() }
    this.buffer.push(entry)
    // 超出容量时丢弃最旧的
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }
  }

  /** 获取当前所有面包屑的副本 */
  getAll(): Breadcrumb[] {
    return [...this.buffer]
  }

  /** 清空面包屑 */
  clear(): void {
    this.buffer = []
  }
}
