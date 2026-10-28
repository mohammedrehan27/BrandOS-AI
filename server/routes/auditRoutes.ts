import { Router, Request, Response, NextFunction } from 'express'
import { auditRepo } from '../db/repositories/auditRepo'

export const auditRouter = Router()

/**
 * GET /api/audit
 * Retrieve immutable audit history log with action type, actor, and review filters
 */
auditRouter.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { actionType, userId, reviewId, search } = req.query
    const events = await auditRepo.getAuditEvents({
      actionType: actionType as string,
      userId: userId as string,
      reviewId: reviewId as string,
      search: search as string,
      workspaceId: req.workspaceId,
    })
    res.json(events)
  } catch (err) {
    next(err)
  }
})
