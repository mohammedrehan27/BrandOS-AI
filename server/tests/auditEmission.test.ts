import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { auditRepo } from '../db/repositories/auditRepo'

describe('BrandOS Immutable Audit Trail Emission', () => {
  it('emits a draft_edited audit event when a draft is manually updated', async () => {
    const newText = 'Updated copy text with softened claims for testing audit emission.'
    const res = await request(app)
      .patch('/api/reviews/REV-2025-089/draft')
      .send({ text: newText })

    expect(res.status).toBe(200)
    expect(res.body.currentText).toBe(newText)

    // Verify audit log has the event
    const events = await auditRepo.getAuditEvents({ reviewId: 'REV-2025-089' })
    const editEvent = events.find((e) => e.actionType === 'draft_edited')

    expect(editEvent).toBeDefined()
    expect(editEvent?.targetType).toBe('review')
    expect(editEvent?.targetId).toBe('REV-2025-089')
    expect(editEvent?.summary).toContain('Edited draft content')
  })

  it('emits a document_archived audit event when a document is deleted', async () => {
    // First upload or check doc-5 exists
    const beforeEventsCount = (await auditRepo.getAuditEvents()).length

    const res = await request(app).delete('/api/documents/doc-5')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const events = await auditRepo.getAuditEvents()
    expect(events.length).toBeGreaterThan(beforeEventsCount)

    const deleteEvent = events.find(
      (e) => e.actionType === 'document_archived' && e.targetId === 'doc-5'
    )
    expect(deleteEvent).toBeDefined()
    expect(deleteEvent?.targetType).toBe('document')
    expect(deleteEvent?.summary).toContain('removed from active registry')
  })
})
