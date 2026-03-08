import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3300,
    // 模拟上报接口：将请求体打印到控制台
    proxy: {
      '/api/report': {
        target: 'http://localhost:3300',
        bypass(req, res) {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: Buffer) => { body += chunk.toString() })
            req.on('end', () => {
              try {
                const events = JSON.parse(body)
                console.log(`\n📥 收到 ${events.length} 条上报事件:`)
                for (const event of events) {
                  console.log(`  [${event.type}] ${JSON.stringify(event.data).slice(0, 120)}`)
                }
              } catch {
                console.log('📥 收到上报（非 JSON）:', body.slice(0, 200))
              }
              res!.writeHead(200, { 'Content-Type': 'text/plain' })
              res!.end('ok')
            })
            return
          }
          res!.writeHead(200)
          res!.end('ok')
        },
      },
    },
  },
})
