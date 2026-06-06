import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import generateRoutes from './routes/generateRoutes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '.env')

if (!existsSync(envPath)) {
  console.error('Missing backend/.env')
  console.error('Copy backend/.env.example to backend/.env and set OPENROUTER_API_KEY.')
  process.exit(1)
}

dotenv.config({ path: envPath })

if (!process.env.OPENROUTER_API_KEY?.trim()) {
  console.error('OPENROUTER_API_KEY is not set in backend/.env')
  process.exit(1)
}

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/', (_req, res) => {
  res.json({
    message: 'Backend is running',
    health: '/health',
    generate: '/api/generate',
    method: 'POST',
  })
})
app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api', generateRoutes)

const port = Number(process.env.PORT) || 5000
const host = process.env.HOST || '127.0.0.1'

const server = app.listen(port, host)

server.on('listening', () => {
  console.log(`Backend listening on http://localhost:${port}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other process or set PORT in backend/.env`)
  } else {
    console.error('Failed to start backend:', err.message)
  }
  process.exit(1)
})

