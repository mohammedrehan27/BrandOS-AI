import { GovernanceAnalytics } from '../../types'
import { reviewRepo } from '../../db/repositories/reviewRepo'
import { calculateGovernanceMetrics } from './metricsCalculator'

export const analyticsService = {
  /**
   * Computes comprehensive brand governance analytics across all reviews and findings,
   * with strict tenant isolation and dynamic metric reconciliation.
   */
  async getAnalytics(timeframe = '30d', workspaceId?: string): Promise<GovernanceAnalytics> {
    const reviews = await reviewRepo.getReviews({ workspaceId })
    return calculateGovernanceMetrics(reviews, timeframe)
  },
}
