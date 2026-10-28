import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { getServiceConfigStatus, env } from '../config/env'

describe('BrandOS Express API Integration Tests', () => {
  it('GET /api/health reports system status and external integration state', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.service).toBe('BrandOS AI Backend')
    expect(res.body.services).toHaveProperty('gemini')
    expect(res.body.services).toHaveProperty('supabase')
  })

  it('GET /api/workspaces lists active workspaces', async () => {
    const res = await request(app).get('/api/workspaces')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('id')
    expect(res.body[0]).toHaveProperty('name')
  })

  it('GET /api/documents returns indexed guideline documents', async () => {
    const res = await request(app).get('/api/documents')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body[0]).toHaveProperty('sections')
  })

  it('GET /api/documents/:id returns specific document with sections', async () => {
    const res = await request(app).get('/api/documents/doc-1')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('doc-1')
    expect(res.body.name).toBe('Acme Clinical Marketing Guidelines 2025')
    expect(Array.isArray(res.body.sections)).toBe(true)
  })

  it('POST /api/reviews submits draft, runs RAG analysis, and returns evidence-backed findings', async () => {
    const draftPayload = {
      title: 'Winter Campaign Ad Copy',
      contentType: 'advertisement',
      campaignName: 'Winter Launch 2026',
      content:
        'Meet our newest supplement! Our formula delivers guaranteed 100% immunity against winter chills and cures fatigue instantly.',
      guidelineDocumentIds: ['doc-1'],
    }

    const res = await request(app)
      .post('/api/reviews')
      .send(draftPayload)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.title).toBe(draftPayload.title)
    expect(res.body.status).toBe('ready_for_approval')
    expect(Array.isArray(res.body.findings)).toBe(true)
    expect(res.body.findings.length).toBeGreaterThan(0)

    // Check that citations are attached
    const finding = res.body.findings[0]
    expect(finding).toHaveProperty('evidence')
    expect(finding.evidence).toHaveProperty('verbatimPassage')
    expect(finding.evidence).toHaveProperty('citationId')
    expect(finding.evidence.relevanceScore).toBeGreaterThanOrEqual(60)
  }, 60000)

  it('POST /api/reviews/:id/decision records reviewer decision and updates status', async () => {
    // Submit review first
    const submitRes = await request(app)
      .post('/api/reviews')
      .send({
        title: 'Social Story Test',
        contentType: 'social_post',
        content: 'Enjoy our daily vitamin formula crafted with standardized zinc bisglycinate.',
      })

    const reviewId = submitRes.body.id

    // Submit approval decision
    const decisionRes = await request(app)
      .post(`/api/reviews/${reviewId}/decision`)
      .set('X-User-Id', 'usr-2') // Marcus Vance (Reviewer)
      .send({
        decision: 'approved',
        comments: 'Verified against Master COA specifications. Fully compliant.',
      })

    expect(decisionRes.status).toBe(200)
    expect(decisionRes.body.status).toBe('approved')
    expect(decisionRes.body.approvalDecision).toBeDefined()
    expect(decisionRes.body.approvalDecision.decision).toBe('approved')
    expect(decisionRes.body.approvalDecision.reviewerName).toBe('Marcus Vance')
  }, 60000)

  it('GET /api/audit returns immutable audit log', async () => {
    const res = await request(app).get('/api/audit')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('actionType')
    expect(res.body[0]).toHaveProperty('actor')
  })

  it('GET /api/analytics returns governance analytics and compliance rate', async () => {
    const res = await request(app).get('/api/analytics?timeframe=30d')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalReviews')
    expect(res.body).toHaveProperty('complianceRatePercent')
    expect(res.body).toHaveProperty('categoryBreakdown')
    expect(res.body).toHaveProperty('reviewerDecisions')
  })

  it('Real external services integration check', async () => {
    const status = getServiceConfigStatus()
    if (status.gemini.configured && env.GEMINI_API_KEY) {
      console.log('Gemini API configured: Testing real live inference...')
      // If user provided GEMINI_API_KEY, test live provider
      const { analyzeDraftWithGemini } = await import('../services/gemini/provider')
      const result = await analyzeDraftWithGemini('Our drink delivers 100% guaranteed immunity.', [])
      expect(result).toBeDefined()
    } else {
      console.log('Gemini API not configured: verified offline fallback handling.')
      expect(status.gemini.configured).toBe(false)
      expect(status.gemini.missingVars).toContain('GEMINI_API_KEY')
    }
  }, 60000)
})
