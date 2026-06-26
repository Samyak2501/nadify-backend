import { serve } from '@hono/node-server'
import app from './src/server.ts'

serve({
  fetch: app.fetch,
  port: 3002
}, (info) => {
  console.log(`✅ JioSaavn API running on http://localhost:${info.port}`)
})
