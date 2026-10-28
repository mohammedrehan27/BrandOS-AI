import { app } from './app'
import { env, logConfigReport } from './config/env'

// Print startup configuration report showing configured vs missing services
logConfigReport()

const server = app.listen(env.PORT, () => {
  console.log(`
======================================================
  BrandOS AI Backend API Server Running
  Port:    http://localhost:${env.PORT}
  Health:  http://localhost:${env.PORT}/api/health
  Mode:    ${env.ALLOW_DEV_FALLBACK ? 'DEV FALLBACK (Offline Simulation Ready)' : 'STRICT PRODUCTION'}
======================================================
  `)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
  })
})
