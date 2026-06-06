import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import generateRoutes from './routes/generateRoutes.js'

dotenv.config()

if (!process.env.OPENROUTER_API_KEY?.trim()) {
  console.error('OPENROUTER_API_KEY is not set')
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

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', generateRoutes)

const port = Number(process.env.PORT) || 5000

const server = app.listen(port)

server.on('listening', () => {
  console.log(`Backend listening on port ${port}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`)
  } else {
    console.error('Failed to start backend:', err.message)
  }
  process.exit(1)
})