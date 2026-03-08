import { defineConfig, createMonitorFromConfig } from '@snailuu/ts-monitor-sdk'
import { errorPlugin } from '@snailuu/ts-monitor-sdk/plugins/error'
import { httpPlugin } from '@snailuu/ts-monitor-sdk/plugins/http'
import { behaviorPlugin } from '@snailuu/ts-monitor-sdk/plugins/behavior'
import { performancePlugin } from '@snailuu/ts-monitor-sdk/plugins/performance'
import { webVitalsPlugin } from '@snailuu/ts-monitor-sdk/plugins/web-vitals'

// ========== 日志面板 ==========
const logEl = document.getElementById('log')!

function log(msg: string) {
  const time = new Date().toLocaleTimeString()
  logEl.textContent += `[${time}] ${msg}\n`
  logEl.scrollTop = logEl.scrollHeight
}

// ========== 初始化 SDK ==========
const monitor = createMonitorFromConfig(defineConfig({
  dsn: '/api/report', // Vite 会代理到控制台打印
  appId: 'browser-example',
  userId: 'demo-user',
  maxBatchSize: 3,
  flushInterval: 3000,
  plugins: [
    errorPlugin({ deduplicate: true, maxDuplicates: 3 }),
    httpPlugin({ ignoreUrls: [/\/api\/report/] }),
    behaviorPlugin({ collectText: true, maxTextLength: 30 }),
    performancePlugin(),
    webVitalsPlugin(),
  ],
}))

// 生命周期钩子
monitor.hook('beforeReport', (event) => {
  log(`📤 beforeReport: [${event.type}] ${JSON.stringify(event.data).slice(0, 100)}`)
  return event
})

monitor.hook('afterReport', (events, success) => {
  log(`${success ? '✅' : '❌'} afterReport: ${events.length} 条事件, 成功=${success}`)
})

monitor.start()
log('🚀 SDK 已启动')

// ========== 绑定按钮事件 ==========

// 错误捕获
document.getElementById('btn-js-error')!.addEventListener('click', () => {
  log('💥 触发 JS 错误...')
  // @ts-expect-error 故意触发错误
  undefinedFunction()
})

document.getElementById('btn-promise-error')!.addEventListener('click', () => {
  log('💥 触发 Promise 拒绝...')
  Promise.reject(new Error('测试 Promise 拒绝'))
})

document.getElementById('btn-resource-error')!.addEventListener('click', () => {
  log('💥 触发资源加载错误...')
  const img = document.createElement('img')
  img.src = 'https://invalid-domain-test.example/404.png'
  document.body.appendChild(img)
})

// HTTP 监控
document.getElementById('btn-fetch-ok')!.addEventListener('click', async () => {
  log('🌐 发起 Fetch 正常请求...')
  try {
    const res = await fetch('https://httpbin.org/get')
    log(`  响应: ${res.status}`)
  } catch (e) {
    log(`  请求失败: ${(e as Error).message}`)
  }
})

document.getElementById('btn-fetch-fail')!.addEventListener('click', async () => {
  log('🌐 发起 Fetch 失败请求...')
  try {
    await fetch('https://invalid-domain-test.example/api')
  } catch (e) {
    log(`  预期失败: ${(e as Error).message}`)
  }
})

document.getElementById('btn-xhr')!.addEventListener('click', () => {
  log('🌐 发起 XHR 请求...')
  const xhr = new XMLHttpRequest()
  xhr.open('GET', 'https://httpbin.org/get')
  xhr.onload = () => log(`  XHR 响应: ${xhr.status}`)
  xhr.onerror = () => log(`  XHR 失败`)
  xhr.send()
})

// 行为追踪
document.getElementById('btn-route-hash')!.addEventListener('click', () => {
  const hash = `#/page-${Date.now()}`
  log(`🔗 Hash 跳转: ${hash}`)
  location.hash = hash
})

document.getElementById('btn-route-push')!.addEventListener('click', () => {
  const path = `/page/${Date.now()}`
  log(`🔗 pushState: ${path}`)
  history.pushState(null, '', path)
})

document.getElementById('btn-custom')!.addEventListener('click', () => {
  log('📝 手动上报自定义事件')
  monitor.report({
    type: 'custom',
    data: { action: 'button_click', label: '手动上报按钮', timestamp: Date.now() },
  })
})

// SDK 控制
document.getElementById('btn-flush')!.addEventListener('click', async () => {
  log('⚡ 手动 Flush...')
  await monitor.flush()
  log('  Flush 完成')
})

document.getElementById('btn-destroy')!.addEventListener('click', async () => {
  log('🛑 销毁 SDK...')
  await monitor.destroy()
  log('  SDK 已销毁，后续操作不会被监控')
})
