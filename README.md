# ts-monitor-sdk

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A lightweight, plugin-based front-end monitoring SDK for both browser and Node.js environments. Zero dependencies, tree-shakable, fully typed.

[中文文档](./README.zh-CN.md)

## Features

- **Zero dependencies** — no runtime deps, keep your bundle lean
- **Plugin architecture** — load only what you need via subpath imports
- **Dual platform** — browser plugins + Node.js plugins
- **Declarative config** — `defineConfig` with full type inference
- **Batch reporting** — auto-batching, retry with exponential backoff, buffer overflow protection
- **Lifecycle hooks** — `beforeReport` / `afterReport` for filtering, transforming, or observing events
- **Breadcrumbs** — automatic user action trail attached to error events
- **Sampling** — configurable `sampleRate` for traffic control
- **Dual format** — ships ESM + CJS with TypeScript declarations

## Install

```bash
npm install @snailuu/ts-monitor-sdk
# or
pnpm add @snailuu/ts-monitor-sdk
# or
yarn add @snailuu/ts-monitor-sdk
```

## Quick Start

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

Or use the imperative API:

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

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dsn` | `string` | — | **Required.** Data reporting endpoint |
| `appId` | `string` | — | **Required.** Application identifier |
| `userId` | `string` | — | User identifier |
| `enabled` | `boolean` | `true` | Enable/disable SDK |
| `sampleRate` | `number` | `1` | Sampling rate (0–1) |
| `maxBatchSize` | `number` | `10` | Events per batch |
| `flushInterval` | `number` | `5000` | Auto-flush interval (ms) |
| `maxRetries` | `number` | `3` | Max retry attempts |
| `maxBufferSize` | `number` | `100` | Buffer capacity, oldest dropped on overflow |
| `maxBreadcrumbs` | `number` | `20` | Max breadcrumb entries |

## Plugins

### Browser Plugins

#### Error Plugin — `@snailuu/ts-monitor-sdk/plugins/error`

Captures JS runtime errors, unhandled promise rejections, and resource load failures.

```ts
import { errorPlugin } from '@snailuu/ts-monitor-sdk/plugins/error'

errorPlugin({
  deduplicate: true,  // default: true
  maxDuplicates: 5,   // default: 5
})
```

| Captured | Source |
|----------|--------|
| JS errors | `window.onerror` |
| Promise rejections | `unhandledrejection` |
| Resource errors | `<img>`, `<script>`, `<link>`, `<audio>`, `<video>` load failures |

#### HTTP Plugin — `@snailuu/ts-monitor-sdk/plugins/http`

Intercepts `fetch` and `XMLHttpRequest` to track HTTP requests.

```ts
import { httpPlugin } from '@snailuu/ts-monitor-sdk/plugins/http'

httpPlugin({
  ignoreUrls: [/\/health$/, /analytics/],
  sanitizeUrl: (url) => url.replace(/token=[^&]+/, 'token=***'),
})
```

#### Behavior Plugin — `@snailuu/ts-monitor-sdk/plugins/behavior`

Tracks user clicks and route changes (hash, popstate, pushState, replaceState).

```ts
import { behaviorPlugin } from '@snailuu/ts-monitor-sdk/plugins/behavior'

behaviorPlugin({
  click: true,        // default: true
  routeChange: true,  // default: true
  collectText: true,  // default: true — set false to avoid PII
  maxTextLength: 50,  // default: 50
})
```

#### Performance Plugin — `@snailuu/ts-monitor-sdk/plugins/performance`

Collects Navigation Timing metrics and paint entries (FP, FCP).

```ts
import { performancePlugin } from '@snailuu/ts-monitor-sdk/plugins/performance'

performancePlugin()
// Reports: dns, tcp, ttfb, domReady, load, domParse, first-paint, first-contentful-paint
```

#### Web Vitals Plugin — `@snailuu/ts-monitor-sdk/plugins/web-vitals`

Measures Core Web Vitals: TTFB, FID, LCP, CLS, INP.

```ts
import { webVitalsPlugin } from '@snailuu/ts-monitor-sdk/plugins/web-vitals'

webVitalsPlugin()
```

### Node.js Plugins

#### Node Error Plugin — `@snailuu/ts-monitor-sdk/plugins/node-error`

Captures `uncaughtException` and `unhandledRejection` in Node.js.

```ts
import { nodeErrorPlugin } from '@snailuu/ts-monitor-sdk/plugins/node-error'

nodeErrorPlugin({
  exitOnError: true, // default: true — process.exit(1) after uncaught exception
})
```

#### Node HTTP Plugin — `@snailuu/ts-monitor-sdk/plugins/node-http`

Intercepts `http.request` and `https.request` in Node.js.

```ts
import { nodeHttpPlugin } from '@snailuu/ts-monitor-sdk/plugins/node-http'

nodeHttpPlugin({
  ignoreUrls: [/localhost/],
  sanitizeUrl: (url) => url,
})
```

## Lifecycle Hooks

```ts
const monitor = createMonitor({ dsn: '...', appId: '...' })

// Filter or transform events before reporting
monitor.hook('beforeReport', (event) => {
  // Return false to drop the event
  if (event.data.url?.includes('/internal')) return false
  // Return a modified event
  return { ...event, data: { ...event.data, env: 'production' } }
})

// Observe reporting results
monitor.hook('afterReport', (events, success) => {
  if (!success) console.warn('Report failed:', events.length, 'events')
})
```

## Custom Transport

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

## Manual Reporting

```ts
monitor.report({
  type: 'custom',
  data: { action: 'checkout', amount: 99.9 },
})
```

## Package Exports

```
@snailuu/ts-monitor-sdk                     → core SDK, types, utils
@snailuu/ts-monitor-sdk/plugins/error       → errorPlugin
@snailuu/ts-monitor-sdk/plugins/http        → httpPlugin
@snailuu/ts-monitor-sdk/plugins/behavior    → behaviorPlugin
@snailuu/ts-monitor-sdk/plugins/performance → performancePlugin
@snailuu/ts-monitor-sdk/plugins/web-vitals  → webVitalsPlugin
@snailuu/ts-monitor-sdk/plugins/node-error  → nodeErrorPlugin
@snailuu/ts-monitor-sdk/plugins/node-http   → nodeHttpPlugin
```

## Development

```bash
pnpm install
pnpm build          # Build ESM + CJS
pnpm test           # Run tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report
```

## License

[ISC](LICENSE)
