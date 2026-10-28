import { Request, Response, NextFunction } from 'express'
import { getSupabaseClient } from '../db/supabase'
import { workspaceRepo } from '../db/repositories/workspaceRepo'
import { env } from '../config/env'
import { UserProfile } from '../types'

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile
      workspaceId?: string
    }
  }
}

/**
 * Authentication & Persona Context Middleware:
 * If Supabase is configured and a Bearer token is provided, verifies JWT.
 * Otherwise, in development fallback, resolves persona via X-User-Id header or default workspace user.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  const client = getSupabaseClient()

  if (authHeader && authHeader.startsWith('Bearer ') && client) {
    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await client.auth.getUser(token)

    if (!error && user) {
      try {
        const profile = await workspaceRepo.getUserById(user.id)
        req.user = profile
        req.workspaceId = profile.workspaceId
        return next()
      } catch {
        // Fall through to fallback or reject
      }
    }
  }

  // Check header override for instant role-switching in prototype
  const customUserId = (req.headers['x-user-id'] as string) || (req.query.userId as string)
  if (customUserId) {
    try {
      const profile = await workspaceRepo.getUserById(customUserId)
      req.user = profile
      req.workspaceId = profile.workspaceId
      return next()
    } catch {
      // Continue to default
    }
  }

  // Fallback dev persona
  if (env.ALLOW_DEV_FALLBACK) {
    try {
      const defaultUser = await workspaceRepo.getCurrentUser()
      req.user = defaultUser
      req.workspaceId = defaultUser.workspaceId
      return next()
    } catch (err: any) {
      return next(err)
    }
  }

  res.status(401).json({
    error: 'Authentication required. Missing or invalid Bearer token.',
    code: 'UNAUTHORIZED',
  })
}
