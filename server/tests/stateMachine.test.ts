import { describe, it, expect } from 'vitest'
import { canTransition, validateTransition, ALLOWED_TRANSITIONS } from '../services/review/stateMachine'
import { IllegalStateTransitionError, ValidationError } from '../services/errors'

describe('Review State Machine & Role Validation', () => {
  it('allows valid lifecycle transitions', () => {
    expect(canTransition('pending', 'in_progress')).toBe(true)
    expect(canTransition('in_progress', 'ready_for_approval')).toBe(true)
    expect(canTransition('ready_for_approval', 'approved')).toBe(true)
    expect(canTransition('ready_for_approval', 'changes_requested')).toBe(true)
    expect(canTransition('ready_for_approval', 'rejected')).toBe(true)
    expect(canTransition('changes_requested', 'in_progress')).toBe(true)
  })

  it('rejects illegal transitions with IllegalStateTransitionError', () => {
    // Cannot jump straight from pending to approved
    expect(canTransition('pending', 'approved')).toBe(false)
    expect(() => validateTransition('pending', 'approved', 'Brand Manager')).toThrow(
      IllegalStateTransitionError
    )

    // Cannot jump from in_progress directly to approved without ready_for_approval
    expect(canTransition('in_progress', 'approved')).toBe(false)
    expect(() => validateTransition('in_progress', 'approved', 'Reviewer')).toThrow(
      IllegalStateTransitionError
    )
  })

  it('prevents Creator role from approving or rejecting their own review', () => {
    expect(() => validateTransition('ready_for_approval', 'approved', 'Creator')).toThrow(
      ValidationError
    )
    expect(() => validateTransition('ready_for_approval', 'rejected', 'Creator')).toThrow(
      ValidationError
    )
    expect(() => validateTransition('ready_for_approval', 'changes_requested', 'Creator')).toThrow(
      ValidationError
    )
  })

  it('permits Reviewer and Brand Manager to approve reviews', () => {
    expect(() => validateTransition('ready_for_approval', 'approved', 'Reviewer')).not.toThrow()
    expect(() => validateTransition('ready_for_approval', 'approved', 'Brand Manager')).not.toThrow()
    expect(() => validateTransition('ready_for_approval', 'changes_requested', 'Reviewer')).not.toThrow()
  })

  it('allows idempotency when current status matches target status', () => {
    expect(() => validateTransition('approved', 'approved', 'Reviewer')).not.toThrow()
    expect(() => validateTransition('pending', 'pending', 'Creator')).not.toThrow()
  })
})
