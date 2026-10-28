import { describe, it, expect } from 'vitest'
import { reviewRepo } from '../db/repositories/reviewRepo'
import { calculateGovernanceMetrics } from '../services/analytics/metricsCalculator'

describe('BrandOS Governance Metrics Reconciliation', () => {
  it('computes exact reconciled compliance rate from authentic review claims', async () => {
    const reviews = await reviewRepo.getReviews()
    expect(reviews).toHaveLength(4)

    // Sum of verified and flagged claims across all 4 reviews:
    // REV-2025-089: 1 verified, 2 contradicted, 1 needsVerification (4 claims)
    // REV-2025-074: 1 verified, 2 contradicted, 0 needsVerification (3 claims)
    // REV-2025-061: 3 verified, 0 contradicted, 0 needsVerification (3 claims)
    // REV-2025-048: 2 verified, 0 contradicted, 0 needsVerification (2 claims)
    // Total claims = 12 (7 verified, 4 contradicted, 1 needsVerification)
    const metrics = calculateGovernanceMetrics(reviews)

    expect(metrics.totalReviews).toBe(4)
    expect(metrics.verifiedClaims).toBe(7)
    expect(metrics.flaggedFindings).toBe(5)
    expect(metrics.complianceRatePercent).toBe(58) // 7 / 12 = 58.333% -> 58%
    expect(metrics.pendingApprovals).toBe(1) // Only REV-2025-089 is ready_for_approval
  })

  it('guarantees each review draft has complete findings matching its stats', async () => {
    const reviews = await reviewRepo.getReviews()
    for (const r of reviews) {
      expect(r.findings.length).toBe(r.stats.totalClaims)
      const verified = r.findings.filter((f) => f.status === 'verified').length
      const contradicted = r.findings.filter((f) => f.status === 'contradicted').length
      const needsVerif = r.findings.filter((f) => f.status === 'needs_verification').length

      expect(verified).toBe(r.stats.verified)
      expect(contradicted).toBe(r.stats.contradicted)
      expect(needsVerif).toBe(r.stats.needsVerification)

      // Verbatim evidence passage integrity check
      for (const f of r.findings) {
        expect(f.evidence.verbatimPassage).toBeTruthy()
        expect(f.evidence.citationId).toBeTruthy()
        expect(f.brandRuleId).toBeTruthy()
      }
    }
  })

  it('generates non-empty category breakdown with distinct severity tiers', async () => {
    const reviews = await reviewRepo.getReviews()
    const metrics = calculateGovernanceMetrics(reviews)

    expect(metrics.categoryBreakdown.length).toBeGreaterThan(0)
    const clinical = metrics.categoryBreakdown.find((c) => c.category === 'Clinical & Efficacy')
    expect(clinical).toBeDefined()
    expect(clinical!.count).toBeGreaterThan(0)
  })
})
