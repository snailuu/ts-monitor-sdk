# ts-monitor-sdk

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

轻量级、插件化的前端监控 SDK，支持浏览器和 Node.js 环境。零依赖、可 tree-shake、完整 TypeScript 类型。

[English](./README.md)

## 特性

- **零依赖** — 无运行时依赖，保持 bundle 精简
- **插件架构** — 通过子路径按需引入，只加载需要的功能
- **双平台** — 浏览器插件 + Node.js 插件
- **声明式配置** — `defineConfig` 提供完整类型推导
- **批量上报** — 自动攒批、指数退避重试、缓冲区溢出保护
- **生命周期钩子** — `beforeReport` / `afterReport` 用于过滤、转换或观测事件
- **面包屑** — 自动记录用户操作轨迹，附加到错误事件
- **采样** — 可配置 `sampleRate` 控制流量
- **双格式** — 同时输出 ESM + CJS，附带 TypeScript 声明文件

## 安装

```bash
npm install @snailuu/ts-monitor-sdk
# 或
pnpm add @snailuu/ts-monitor-sdk
# 或
yarn add @snailuu/ts-monitor-sdk
```

## 快速开始

```ts
import { defineConfig, createMonitorFromConfig } from '@snailuu/ts-monitor-sdk'
import { errorPlugin } from '@snailuu/ts-monitor-sdk/plugins/error'
import { httpPlugin } from '@snailuu/ts-monitor-sdk/plugins/http'
import { behaviorPlugin } from '@snailuu/ts-monitor-sdk/plugins/behavior'

const monitor = createMonitorFromConfig(defineConfig({
  dsn: 'https://your-server.com/api/report',
  appId: 'my-app',
  plugins: [
    errorPlugin({ deduplicate: true }),
    httpPlugin({ ignoreUrls: [/\/health$/] }),
    behaviorPlugin(),
  ],
}))

monitor.start()
```

也可以使用命令式 API：

```ts
import { createMonitor } from '@snailuu/ts-monitor-sdk'
import { errorPlugin } from '@snailuu/ts-monitor-sdk/plugins/error'

const monitor = createMonitor({
  dsn: 'https://your-server.com/api/report',
  appId: 'my-app',
})

monitor.use(errorPlugin())
monitor.start()
```

## 配置项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dsn` | `string` | — | **必填**，数据上报地址 |
| `appId` | `string` | — | **必填**，应用标识 |
| `userId` | `string` | — | 用户标识 |
| `enabled` | `boolean` | `true` | 是否启用 |
| `sampleRate` | `number` | `1` | 采样率（0–1） |
| `maxBatchSize` | `number` | `10` | 每批上报事件数 |
| `flushInterval` | `number` | `5000` | 自动上报间隔（ms） |
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `maxBufferSize` | `number` | `100` | 缓冲区容量，溢出时丢弃最旧事件 |
| `maxBreadcrumbs` | `number` | `20` | 面包屑最大数量 |

## 插件

### 浏览器插件

#### 错误捕获 — `@snailuu/ts-monitor-sdk/plugins/error`

捕获 JS 运行时错误、未处理的 Promise 拒绝、资源加载失败。

```ts
import { errorPlugin } from '@snailuu/ts-monitor-sdk/plugins/error'

errorPlugin({
  deduplicate: true,  // 默认: true - 错误去重
  maxDuplicates: 5,   // 默认: 5 - 相同错误最多上报次数
})
```

| 捕获类型 | 来源 |
|----------|------|
| JS 错误 | `window.onerror` |
| Promise 拒绝 | `unhandledrejection` |
| 资源错误 | `<img>`、`<script>`、`<link>`、`<audio>`、`<video>` 加载失败 |

#### HTTP 监控 — `@snailuu/ts-monitor-sdk/plugins/http`

拦截 `fetch` 和 `XMLHttpRequest`，记录请求耗时和状态。

```ts
import { httpPlugin } from '@snailuu/ts-monitor-sdk/plugins/http'

httpPlugin({
  ignoreUrls: [/\/health$/, /analytics/],             // 忽略的 URL
  sanitizeUrl: (url) => url.replace(/token=[^&]+/, 'token=***'),  // URL 脱敏
})
```

#### 行为追踪 — `@snailuu/ts-monitor-sdk/plugins/behavior`

追踪用户点击和路由变化（hash、popstate、pushState、replaceState）。

```ts
import { behaviorPlugin } from '@snailuu/ts-monitor-sdk/plugins/behavior'

behaviorPlugin({
  click: true,        // 默认: true - 捕获点击
  routeChange: true,  // 默认: true - 捕获路由变化
  collectText: true,  // 默认: true - 收集元素文本，设为 false 避免隐私数据
  maxTextLength: 50,  // 默认: 50 - 文本最大长度
})
```

#### 性能指标 — `@snailuu/ts-monitor-sdk/plugins/performance`

收集 Navigation Timing 和 Paint 指标（FP、FCP）。

```ts
import { performancePlugin } from '@snailuu/ts-monitor-sdk/plugins/performance'

performancePlugin()
// 上报: dns, tcp, ttfb, domReady, load, domParse, first-paint, first-contentful-paint
```

#### Web Vitals — `@snailuu/ts-monitor-sdk/plugins/web-vitals`

测量 Core Web Vitals：TTFB、FID、LCP、CLS、INP。

```ts
import { webVitalsPlugin } from '@snailuu/ts-monitor-sdk/plugins/web-vitals'

webVitalsPlugin()
```

### Node.js 插件

#### Node 错误捕获 — `@snailuu/ts-monitor-sdk/plugins/node-error`

捕获 Node.js 的 `uncaughtException` 和 `unhandledRejection`。

```ts
import { nodeErrorPlugin } from '@snailuu/ts-monitor-sdk/plugins/node-error'

nodeErrorPlugin({
  exitOnError: true, // 默认: true - 未捕获异常后退出进程
})
```

#### Node HTTP 监控 — `@snailuu/ts-monitor-sdk/plugins/node-http`

拦截 `http.request` 和 `https.request`。

```ts
import { nodeHttpPlugin } from '@snailuu/ts-monitor-sdk/plugins/node-http'

nodeHttpPlugin({
  ignoreUrls: [/localhost/],
  sanitizeUrl: (url) => url,
})
```

## 生命周期钩子

```ts
const monitor = createMonitor({ dsn: '...', appId: '...' })

// 上报前过滤或转换事件
monitor.hook('beforeReport', (event) => {
  if (event.data.url?.includes('/internal')) return false  // 丢弃
  return { ...event, data: { ...event.data, env: 'production' } }  // 修改
})

// 上报后观测结果
monitor.hook('afterReport', (events, success) => {
  if (!success) console.warn('上报失败:', events.length, '条事件')
})
```

## 自定义 Transport

```ts
import { createMonitor } from '@snailuu/ts-monitor-sdk'
import type { Transport } from '@snailuu/ts-monitor-sdk'

const customTransport: Transport = {
  send: async (url, data) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Token': 'secret' },
      body: JSON.stringify(data),
    })
    return res.ok
  },
}

const monitor = createMonitor({ dsn: '...', appId: '...' }, customTransport)
```

## 手动上报

```ts
monitor.report({
  type: 'custom',
  data: { action: 'checkout', amount: 99.9 },
})
```

## 子路径导出

```
@snailuu/ts-monitor-sdk                     → 核心 SDK、类型、工具函数
@snailuu/ts-monitor-sdk/plugins/error       → 错误捕获插件
@snailuu/ts-monitor-sdk/plugins/http        → HTTP 监控插件
@snailuu/ts-monitor-sdk/plugins/behavior    → 行为追踪插件
@snailuu/ts-monitor-sdk/plugins/performance → 性能指标插件
@snailuu/ts-monitor-sdk/plugins/web-vitals  → Web Vitals 插件
@snailuu/ts-monitor-sdk/plugins/node-error  → Node.js 错误捕获插件
@snailuu/ts-monitor-sdk/plugins/node-http   → Node.js HTTP 监控插件
```

## 开发

```bash
pnpm install
pnpm build          # 构建 ESM + CJS
pnpm test           # 运行测试
pnpm test:watch     # 监听模式
pnpm test:coverage  # 覆盖率报告
```

## 许可证

[ISC](LICENSE)
