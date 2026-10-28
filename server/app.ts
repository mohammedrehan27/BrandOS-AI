import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { authMiddleware } from './middleware/auth'
import { centralErrorHandler } from './middleware/errorHandler'
import { authRouter } from './routes/authRoutes'
import { documentRouter } from './routes/documentRoutes'
import { reviewRouter } from './routes/reviewRoutes'
import { auditRouter } from './routes/auditRoutes'
import { analyticsRouter } from './routes/analyticsRoutes'
import { getServiceConfigStatus, env } from './config/env'

export const app = express()

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Workspace-Id'],
  })
)

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// System Health & Service Configuration Endpoint
app.get('/api/health', (_req, res) => {
  const status = getServiceConfigStatus()
  res.json({
    status: 'ok',
    service: 'BrandOS AI Backend',
    version: '1.0.0',
    mode: env.ALLOW_DEV_FALLBACK ? 'development_with_fallback' : 'production_strict',
    timestamp: new Date().toISOString(),
    services: {
      gemini: {
        configured: status.gemini.configured,
        model: env.GEMINI_MODEL,
        missingVariables: status.gemini.missingVars,
      },
      supabase: {
        configured: status.supabase.configured,
        missingVariables: status.supabase.missingVars,
      },
    },
  })
})

// Authentication & Persona Context Middleware
app.use('/api', authMiddleware)

// Mount domain routes
app.use('/api', authRouter)
app.use('/api', documentRouter)
app.use('/api', reviewRouter)
app.use('/api', auditRouter)
app.use('/api', analyticsRouter)

// Serve production static frontend build (SPA client-side routing)
const distPath = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Central Error Handler
app.use(centralErrorHandler)
