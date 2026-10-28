import { Request, Response, NextFunction } from 'express'
import {
  ServiceNotConfiguredError,
  ValidationError,
  NotFoundError,
  IllegalStateTransitionError,
} from '../services/errors'
import {
  GeminiQuotaExceededError,
  GeminiTimeoutError,
} from '../services/gemini/errorHandler'

export function centralErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AI Quota / Rate limit errors (HTTP 429)
  if (err instanceof GeminiQuotaExceededError || err?.code === 'GEMINI_QUOTA_EXCEEDED') {
    res.status(429).json({
      error: err.message,
      code: 'GEMINI_QUOTA_EXCEEDED',
    })
    return
  }

  // AI Timeout errors (HTTP 504)
  if (err instanceof GeminiTimeoutError || err?.code === 'GEMINI_TIMEOUT') {
    res.status(504).json({
      error: err.message,
      code: 'GEMINI_TIMEOUT',
    })
    return
  }

  // Service configuration errors (HTTP 503)
  if (err instanceof ServiceNotConfiguredError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      serviceName: err.serviceName,
      missingVariables: err.missingVariables,
    })
    return
  }

  // Zod / Domain validation errors (HTTP 400)
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    })
    return
  }

  // Resource not found (HTTP 404)
  if (err instanceof NotFoundError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
    return
  }

  // Illegal state machine transitions (HTTP 409)
  if (err instanceof IllegalStateTransitionError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
    return
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      error: `File upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    })
    return
  }

  // Unexpected internal errors (HTTP 500)
  console.error('[BrandOS Server Error]:', err)
  res.status(500).json({
    error: err.message || 'An unexpected internal server error occurred.',
    code: 'INTERNAL_SERVER_ERROR',
  })
}
