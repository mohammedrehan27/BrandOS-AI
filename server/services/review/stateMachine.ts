import { ReviewStatus, UserRole } from '../../types'
import { IllegalStateTransitionError, ValidationError } from '../errors'

/**
 * Valid state transitions for BrandOS review lifecycle:
 *
 * pending -> in_progress (auto on RAG processing)
 * in_progress -> ready_for_approval (when creator addresses claims)
 * in_progress -> changes_requested (if flagged by automated compliance)
 * ready_for_approval -> approved (by Reviewer/Brand Manager)
 * ready_for_approval -> changes_requested (by Reviewer/Brand Manager)
 * ready_for_approval -> rejected (by Reviewer/Brand Manager)
 * changes_requested -> in_progress (when creator edits draft)
 * approved -> in_progress (if new revision uploaded)
 * rejected -> in_progress (if revised and resubmitted)
 */
export const ALLOWED_TRANSITIONS: Record<ReviewStatus, readonly ReviewStatus[]> = {
  pending: ['in_progress', 'ready_for_approval'],
  in_progress: ['ready_for_approval', 'changes_requested'],
  changes_requested: ['in_progress', 'ready_for_approval'],
  ready_for_approval: ['approved', 'changes_requested', 'rejected', 'in_progress'],
  approved: ['in_progress'],
  rejected: ['in_progress'],
} as const

export function canTransition(current: ReviewStatus, target: ReviewStatus): boolean {
  if (current === target) return true
  const allowed = ALLOWED_TRANSITIONS[current]
  return allowed ? allowed.includes(target) : false
}

/**
 * Validates whether a state transition is legal according to lifecycle rules and user roles.
 * Throws IllegalStateTransitionError or ValidationError if invalid.
 */
export function validateTransition(
  current: ReviewStatus,
  target: ReviewStatus,
  actorRole?: UserRole
): void {
  if (current === target) return

  if (!canTransition(current, target)) {
    throw new IllegalStateTransitionError(
      current,
      target,
      `Valid next statuses from '${current}' are: ${ALLOWED_TRANSITIONS[current]?.join(', ') || 'none'}`
    )
  }

  // Role validation for final approval/rejection decisions
  const requiresGovernanceAuthority = target === 'approved' || target === 'rejected' || target === 'changes_requested'
  if (requiresGovernanceAuthority && actorRole === 'Creator') {
    throw new ValidationError(
      `Role 'Creator' is not authorized to submit approval decision '${target}'. Requires 'Reviewer' or 'Brand Manager'.`
    )
  }
}
