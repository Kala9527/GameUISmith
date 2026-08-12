import { defineConfig } from 'vite'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const openAiDevProxy = (): Plugin => ({
  name: 'game-ui-smith-openai-dev-proxy',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/__openai-proxy', (request: Connect.IncomingMessage, response) => {
      if (request.method !== 'POST') {
        response.statusCode = 405
        response.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
        return
      }

      let rawBody = ''
      request.on('data', (chunk: Buffer) => {
        rawBody += chunk
      })
      request.on('end', async () => {
        try {
          const body = JSON.parse(rawBody || '{}')
          const targetUrl = String(body.targetUrl ?? '')
          const apiKey = String(body.apiKey ?? '')
          const payload = body.payload ?? {}

          if (!/^https?:\/\//.test(targetUrl)) {
            response.statusCode = 400
            response.end(JSON.stringify({ error: { message: 'targetUrl must start with http:// or https://' } }))
            return
          }
          if (!apiKey) {
            response.statusCode = 400
            response.end(JSON.stringify({ error: { message: 'apiKey is required' } }))
            return
          }

          const upstream = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })
          const text = await upstream.text()
          response.statusCode = upstream.status
          response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
          response.end(text)
        } catch (error) {
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json')
          response.end(
            JSON.stringify({
              error: {
                message: error instanceof Error ? error.message : 'OpenAI dev proxy failed',
              },
            }),
          )
        }
      })
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), openAiDevProxy()],
})
