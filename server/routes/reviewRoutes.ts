import { Router, Request, Response, NextFunction } from 'express'
import { reviewRepo } from '../db/repositories/reviewRepo'
import { documentRepo } from '../db/repositories/documentRepo'
import { auditRepo } from '../db/repositories/auditRepo'
import { approvalService } from '../services/review/approvalService'
import { executeRagAnalysis } from '../services/rag/pipeline'
import { ReviewDraft, ContentType } from '../types'
import { ValidationError, NotFoundError } from '../services/errors'

export const reviewRouter = Router()

/**
 * GET /api/reviews
 * List review drafts filtered by status, content type, and keyword search
 */
reviewRouter.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, contentType, search } = req.query
    const reviews = await reviewRepo.getReviews({
      status: status as string,
      contentType: contentType as string,
      search: search as string,
      workspaceId: req.workspaceId,
    })
    res.json(reviews)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/reviews/:id
 * Retrieve a single review draft with all findings and citations
 */
reviewRouter.get('/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const review = await reviewRepo.getReviewById(id)
    if (!review) {
      throw new NotFoundError('ReviewDraft', id)
    }
    res.json(review)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/reviews
 * Submits content for compliance review, retrieves guideline passages,
 * executes Gemini / RAG analysis, generates evidence citations, and stores draft.
 */
reviewRouter.post('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, contentType, campaignName, content, guidelineDocumentIds } = req.body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Draft title is required.')
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new ValidationError('Draft content text is required.')
    }

    // 1. Fetch active guideline documents for retrieval
    const allActiveDocs = await documentRepo.getDocuments({ status: 'active' })
    const targetDocs =
      guidelineDocumentIds && Array.isArray(guidelineDocumentIds) && guidelineDocumentIds.length > 0
        ? allActiveDocs.filter((d) => guidelineDocumentIds.includes(d.id))
        : allActiveDocs

    const draftId = `REV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

    // 2. Execute RAG analysis pipeline with strict evidence validation
    const pipelineResult = await executeRagAnalysis(draftId, content, targetDocs)

    const submittedBy = req.user || {
      id: 'usr-1',
      name: 'Elena Rostova',
      email: 'elena.rostova@acmehealth.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'Brand Manager' as const,
      workspaceId: 'ws-1',
    }

    const newDraft: ReviewDraft = {
      id: draftId,
      title: title.trim(),
      contentType: (contentType as ContentType) || 'social_post',
      campaignName: campaignName?.trim() || undefined,
      workspaceId: req.workspaceId || 'ws-1',
      submittedBy: {
        id: submittedBy.id,
        name: submittedBy.name,
        email: submittedBy.email,
        avatar: submittedBy.avatar,
      },
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalText: content,
      currentText: content,
      guidelineDocumentIds: targetDocs.map((d) => d.id),
      status: 'ready_for_approval',
      findings: pipelineResult.findings,
      stats: pipelineResult.stats,
    }

    // 3. Persist review draft and findings
    const saved = await reviewRepo.createReview(newDraft)

    // 4. Record audit events
    await auditRepo.recordAuditEvent({
      actionType: 'draft_submitted',
      actor: {
        id: submittedBy.id,
        name: submittedBy.name,
        email: submittedBy.email,
        role: submittedBy.role,
      },
      targetType: 'review',
      targetId: saved.id,
      targetTitle: saved.title,
      summary: `Submitted draft "${saved.title}" for pre-flight governance scan against ${targetDocs.length} guideline documents.`,
      metadata: {
        contentType: saved.contentType,
        wordCount: content.split(/\s+/).length,
      },
    })

    const isAiMode = pipelineResult.executionMode === 'gemini_live_ai'
    await auditRepo.recordAuditEvent({
      actionType: 'finding_generated',
      actor: {
        id: isAiMode ? 'sys-gemini-ai' : 'sys-offline-rule-fallback',
        name: isAiMode
          ? 'Google Gemini AI Governance Engine'
          : 'BrandOS Offline Rule Fallback Engine',
        email: 'engine@brandos.internal',
        role: 'Automated System',
      },
      targetType: 'review',
      targetId: saved.id,
      targetTitle: saved.title,
      summary: `Analyzed copy via ${isAiMode ? 'live Gemini AI inference' : 'offline deterministic rule fallback'}: generated ${pipelineResult.stats.totalClaims} findings (${pipelineResult.stats.verified} Verified, ${pipelineResult.stats.contradicted} Contradicted, ${pipelineResult.stats.needsVerification} Needs Verification).`,
      metadata: {
        stats: pipelineResult.stats,
        executionMode: pipelineResult.executionMode,
      },
    })

    res.status(201).json(saved)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/reviews/:id/suggestions/:findingId/apply
 * Applies a suggested correction to the active draft text and updates finding status to verified
 */
reviewRouter.post(
  '/reviews/:id/suggestions/:findingId/apply',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const findingId = req.params.findingId as string
      const { customText } = req.body
      const actor = req.user || (await reviewRepo.getReviewById(id))?.submittedBy

      const updated = await approvalService.applyFindingSuggestion(
        id,
        findingId,
        actor as any,
        customText
      )
      res.json(updated)
    } catch (err) {
      next(err)
    }
  }
)

/**
 * POST /api/reviews/:id/suggestions/:findingId/reject
 * Rejects a suggested correction
 */
reviewRouter.post(
  '/reviews/:id/suggestions/:findingId/reject',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const findingId = req.params.findingId as string
      const actor = req.user || (await reviewRepo.getReviewById(id))?.submittedBy

      const updated = await approvalService.rejectFindingSuggestion(id, findingId, actor as any)
      res.json(updated)
    } catch (err) {
      next(err)
    }
  }
)

/**
 * PATCH /api/reviews/:id/draft
 * Edits active draft text manually
 */
reviewRouter.patch(
  '/reviews/:id/draft',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const { text } = req.body
      if (typeof text !== 'string') {
        throw new ValidationError('New draft text is required.')
      }

      const updated = await reviewRepo.updateDraftText(id, text)
      const actor = req.user || {
        id: 'usr-3',
        name: 'Sophia Chen',
        email: 'sophia.chen@acmehealth.com',
        role: 'Creator',
      }
      await auditRepo.recordAuditEvent({
        actionType: 'draft_edited',
        workspaceId: req.workspaceId || updated.workspaceId || 'ws-1',
        actor: {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          role: actor.role,
        },
        targetType: 'review',
        targetId: updated.id,
        targetTitle: updated.title,
        summary: `Edited draft content for "${updated.title}" (${text.length} chars).`,
        metadata: {
          characterCount: text.length,
        },
      })
      res.json(updated)
    } catch (err) {
      next(err)
    }
  }
)

/**
 * POST /api/reviews/:id/decision
 * Records final human review decision ('approved', 'changes_requested', 'rejected')
 */
reviewRouter.post(
  '/reviews/:id/decision',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const { decision, comments } = req.body

      if (!['approved', 'changes_requested', 'rejected'].includes(decision)) {
        throw new ValidationError(`Invalid decision '${decision}'. Must be approved, changes_requested, or rejected.`)
      }

      const actor = req.user || {
        id: 'usr-2',
        name: 'Marcus Vance',
        email: 'marcus.vance@acmehealth.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'Reviewer' as const,
        workspaceId: 'ws-1',
      }

      const approvalDecision = {
        decision,
        reviewerId: actor.id,
        reviewerName: actor.name,
        reviewerRole: actor.role,
        comments: comments || '',
        timestamp: new Date().toISOString(),
      }

      const updated = await approvalService.processDecision(id, approvalDecision, actor)
      res.json(updated)
    } catch (err) {
      next(err)
    }
  }
)
