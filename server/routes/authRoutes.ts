import { Router, Request, Response, NextFunction } from 'express'
import { workspaceRepo } from '../db/repositories/workspaceRepo'
import { ValidationError } from '../services/errors'

export const authRouter = Router()

/**
 * GET /api/auth/me
 * Returns current authenticated or active dev user profile
 */
authRouter.get('/auth/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user || (await workspaceRepo.getCurrentUser())
    res.json(user)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/auth/switch
 * Prototype persona switcher (Elena Rostova / Marcus Vance / Sophia Chen)
 */
authRouter.post('/auth/switch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body
    if (!userId) {
      throw new ValidationError('userId is required to switch user')
    }
    const switchedUser = await workspaceRepo.switchUser(userId)
    res.json(switchedUser)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/users
 * Returns available user profiles for current workspace
 */
authRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = (req.query.workspaceId as string) || req.workspaceId
    const users = await workspaceRepo.getUsers(workspaceId)
    res.json(users)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/workspaces
 * Returns list of accessible enterprise workspaces
 */
authRouter.get('/workspaces', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaces = await workspaceRepo.getWorkspaces()
    res.json(workspaces)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/workspaces/current
 * Returns currently active workspace metadata
 */
authRouter.get('/workspaces/current', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const current = await workspaceRepo.getCurrentWorkspace()
    res.json(current)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/workspaces/switch
 * Switches current active workspace context
 */
authRouter.post('/workspaces/switch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.body
    if (!workspaceId) {
      throw new ValidationError('workspaceId is required')
    }
    const ws = await workspaceRepo.switchWorkspace(workspaceId)
    res.json(ws)
  } catch (err) {
    next(err)
  }
})
