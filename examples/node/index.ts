import http from 'node:http'
import { defineConfig, createMonitorFromConfig } from '@snailuu/ts-monitor-sdk'
import { nodeErrorPlugin } from '@snailuu/ts-monitor-sdk/plugins/node-error'
import { nodeHttpPlugin } from '@snailuu/ts-monitor-sdk/plugins/node-http'

// ========== 1. 启动一个模拟上报服务器 ==========
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    const events = JSON.parse(body)
    console.log(`\n📥 收到 ${events.length} 条上报事件:`)
    for (const event of events) {
      console.log(`  [${event.type}] ${JSON.stringify(event.data)}`)
    }
    res.writeHead(200)
    res.end('ok')
  })
})

server.listen(3301, () => {
  console.log('📡 模拟上报服务器已启动: http://localhost:3301\n')
  startSDK()
})

// ========== 2. 初始化 SDK ==========
async function startSDK() {
  const monitor = createMonitorFromConfig(defineConfig({
    dsn: 'http://localhost:3301/report',
    appId: 'node-example',
    userId: 'test-user',
    maxBatchSize: 5,
    flushInterval: 2000,
    plugins: [
      nodeErrorPlugin({ exitOnError: false }),
      nodeHttpPlugin({ ignoreUrls: [/localhost:3301/] }),
    ],
  }))

  // 注册生命周期钩子
  monitor.hook('beforeReport', (event) => {
    console.log(`\n🔄 beforeReport: [${event.type}]`)
    return event
  })

  monitor.hook('afterReport', (events, success) => {
    console.log(`✅ afterReport: ${events.length} 条事件, 成功=${success}`)
  })

  monitor.start()
  console.log('🚀 SDK 已启动\n')

  // ========== 3. 测试场景 ==========

  // 场景一：手动上报自定义事件
  console.log('--- 场景一：手动上报自定义事件 ---')
  monitor.report({ type: 'custom', data: { action: 'page_view', page: '/home' } })
  monitor.report({ type: 'custom', data: { action: 'button_click', target: 'submit' } })

  // 场景二：发起 HTTP 请求（会被 nodeHttpPlugin 拦截上报）
  console.log('--- 场景二：HTTP 请求监控 ---')
  try {
    await fetch('https://httpbin.org/get')
    console.log('  GET https://httpbin.org/get -> 完成')
  } catch {
    console.log('  GET https://httpbin.org/get -> 网络错误（正常，仅测试拦截）')
  }

  try {
    await fetch('https://httpbin.org/post', { method: 'POST', body: '{"test":1}' })
    console.log('  POST https://httpbin.org/post -> 完成')
  } catch {
    console.log('  POST https://httpbin.org/post -> 网络错误（正常，仅测试拦截）')
  }

  // 场景三：手动 flush 并等待上报完成
  console.log('\n--- 手动 flush ---')
  await monitor.flush()

  // 等待上报完成后清理
  setTimeout(async () => {
    await monitor.destroy()
    server.close()
    console.log('\n🛑 SDK 已销毁，服务器已关闭')
  }, 3000)
}
