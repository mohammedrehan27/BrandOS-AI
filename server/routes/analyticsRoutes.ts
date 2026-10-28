import { Router, Request, Response, NextFunction } from 'express'
import { analyticsService } from '../services/analytics/analyticsService'

export const analyticsRouter = Router()

/**
 * GET /api/analytics
 * Retrieve enterprise governance statistics, compliance trends, and violation metrics
 */
analyticsRouter.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timeframe = (req.query.timeframe as string) || '30d'
    const analytics = await analyticsService.getAnalytics(timeframe, req.workspaceId)
    res.json(analytics)
  } catch (err) {
    next(err)
  }
})
