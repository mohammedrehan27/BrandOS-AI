import { describe, it, expect } from 'vitest'
import { reviewRepo } from '../db/repositories/reviewRepo'
import { documentRepo } from '../db/repositories/documentRepo'
import { auditRepo } from '../db/repositories/auditRepo'
import { analyticsService } from '../services/analytics/analyticsService'

describe('Multi-Tenant Workspace Scoping & Isolation', () => {
  it('filters reviews strictly by workspaceId', async () => {
    const ws1Reviews = await reviewRepo.getReviews({ workspaceId: 'ws-1' })
    expect(ws1Reviews.length).toBeGreaterThan(0)
    for (const r of ws1Reviews) {
      expect(r.workspaceId).toBe('ws-1')
    }

    const ws2Reviews = await reviewRepo.getReviews({ workspaceId: 'ws-2' })
    expect(ws2Reviews).toHaveLength(0)
  })

  it('filters documents strictly by workspaceId', async () => {
    const ws1Docs = await documentRepo.getDocuments({ workspaceId: 'ws-1' })
    expect(ws1Docs.length).toBeGreaterThan(0)

    const ws2Docs = await documentRepo.getDocuments({ workspaceId: 'ws-2' })
    expect(ws2Docs).toHaveLength(0)
  })

  it('filters audit events strictly by workspaceId', async () => {
    // Record an event in ws-2
    await auditRepo.recordAuditEvent({
      actionType: 'document_uploaded',
      workspaceId: 'ws-2',
      actor: {
        id: 'usr-4',
        name: 'TechNova Admin',
        email: 'admin@technova.com',
        role: 'Brand Manager',
      },
      targetType: 'document',
      targetId: 'doc-99',
      targetTitle: 'TechNova Brand Guidelines',
      summary: 'Uploaded TechNova guidelines',
    })

    const ws2Events = await auditRepo.getAuditEvents({ workspaceId: 'ws-2' })
    expect(ws2Events.length).toBeGreaterThan(0)
    for (const e of ws2Events) {
      expect(e.workspaceId).toBe('ws-2')
    }
  })

  it('computes isolated governance analytics per workspace', async () => {
    const ws1Analytics = await analyticsService.getAnalytics('30d', 'ws-1')
    expect(ws1Analytics.totalReviews).toBe(4)

    const ws2Analytics = await analyticsService.getAnalytics('30d', 'ws-2')
    expect(ws2Analytics.totalReviews).toBe(0)
    expect(ws2Analytics.verifiedClaims).toBe(0)
    expect(ws2Analytics.flaggedFindings).toBe(0)
  })
})
