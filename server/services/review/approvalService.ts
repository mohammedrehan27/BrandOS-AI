import { ApprovalDecision, ReviewDraft, UserProfile } from '../../types'
import { reviewRepo } from '../../db/repositories/reviewRepo'
import { auditRepo } from '../../db/repositories/auditRepo'
import { validateTransition } from './stateMachine'
import { NotFoundError, ValidationError } from '../errors'

export const approvalService = {
  /**
   * Submits a formal human approval/rejection decision, enforcing legal state transitions,
   * verifying no unresolved brand contradictions exist for approval, persisting the decision,
   * and logging an immutable audit record.
   */
  async processDecision(
    reviewId: string,
    decision: ApprovalDecision,
    actor: UserProfile
  ): Promise<ReviewDraft> {
    const existing = await reviewRepo.getReviewById(reviewId)
    if (!existing) {
      throw new NotFoundError('ReviewDraft', reviewId)
    }

    // 1. Enforce state machine transition and user authority
    validateTransition(existing.status, decision.decision, actor.role)

    // 2. Enforce brand governance: Cannot approve draft with active contradicted findings
    if (decision.decision === 'approved') {
      const activeContradictions = existing.findings.filter(
        (f) =>
          f.status === 'contradicted' &&
          f.suggestionStatus !== 'applied' &&
          f.suggestionStatus !== 'edited'
      )
      if (activeContradictions.length > 0) {
        throw new ValidationError(
          `Cannot approve draft "${existing.title}": Contains ${activeContradictions.length} unresolved contradicted claim(s). All violations must be corrected before sign-off.`
        )
      }
    }

    // 3. Persist decision in database repository
    const updated = await reviewRepo.submitDecision(reviewId, decision)

    // 4. Map decision to audit action type
    const actionTypeMap: Record<ApprovalDecision['decision'], 'approval_decision' | 'rejection_decision' | 'revisions_requested'> = {
      approved: 'approval_decision',
      rejected: 'rejection_decision',
      changes_requested: 'revisions_requested',
    }

    const actionType = actionTypeMap[decision.decision]

    // 5. Record immutable audit event
    await auditRepo.recordAuditEvent({
      actionType,
      workspaceId: existing.workspaceId || actor.workspaceId || 'ws-1',
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      targetType: 'review',
      targetId: reviewId,
      targetTitle: existing.title,
      summary: `Review status changed to '${decision.decision}': ${decision.comments || 'No comments provided.'}`,
      metadata: {
        previousStatus: existing.status,
        newStatus: decision.decision,
        reviewerId: actor.id,
      },
    })

    return updated
  },

  /**
   * Applies an AI finding suggestion to the live draft, updates finding status,
   * recalculates compliance metrics, and logs an audit trail event.
   */
  async applyFindingSuggestion(
    reviewId: string,
    findingId: string,
    actor: UserProfile,
    customText?: string
  ): Promise<ReviewDraft> {
    const existing = await reviewRepo.getReviewById(reviewId)
    if (!existing) throw new NotFoundError('ReviewDraft', reviewId)

    const updated = await reviewRepo.applySuggestion(reviewId, findingId, customText)

    await auditRepo.recordAuditEvent({
      actionType: customText ? 'suggestion_edited' : 'suggestion_accepted',
      workspaceId: existing.workspaceId || actor.workspaceId || 'ws-1',
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      targetType: 'review',
      targetId: reviewId,
      targetTitle: existing.title,
      summary: customText
        ? `Edited and applied correction for finding ${findingId}: "${customText}"`
        : `Accepted AI suggested correction for finding ${findingId}`,
      metadata: {
        findingId,
        customText,
      },
    })

    return updated
  },

  /**
   * Rejects an AI finding suggestion without applying it to the draft text.
   */
  async rejectFindingSuggestion(
    reviewId: string,
    findingId: string,
    actor: UserProfile
  ): Promise<ReviewDraft> {
    const existing = await reviewRepo.getReviewById(reviewId)
    if (!existing) throw new NotFoundError('ReviewDraft', reviewId)

    const updated = await reviewRepo.rejectSuggestion(reviewId, findingId)

    await auditRepo.recordAuditEvent({
      actionType: 'suggestion_rejected',
      workspaceId: existing.workspaceId || actor.workspaceId || 'ws-1',
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      targetType: 'review',
      targetId: reviewId,
      targetTitle: existing.title,
      summary: `Rejected suggested correction for finding ${findingId}`,
      metadata: { findingId },
    })

    return updated
  },
}
