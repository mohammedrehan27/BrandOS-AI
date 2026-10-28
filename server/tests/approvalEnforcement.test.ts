import { describe, it, expect } from 'vitest'
import { approvalService } from '../services/review/approvalService'
import { ValidationError } from '../services/errors'
import { UserProfile } from '../types'

describe('Brand Governance Approval Guardrails', () => {
  const reviewerActor: UserProfile = {
    id: 'usr-2',
    name: 'Marcus Vance',
    email: 'marcus.vance@acmehealth.com',
    avatar: '',
    role: 'Reviewer',
    workspaceId: 'ws-1',
  }

  const creatorActor: UserProfile = {
    id: 'usr-3',
    name: 'Sophia Chen',
    email: 'sophia.chen@acmehealth.com',
    avatar: '',
    role: 'Creator',
    workspaceId: 'ws-1',
  }

  it('rejects approval of drafts containing active contradicted claims', async () => {
    // REV-2025-089 has 2 active contradicted findings (fnd-1, fnd-2)
    await expect(
      approvalService.processDecision(
        'REV-2025-089',
        {
          decision: 'approved',
          reviewerId: reviewerActor.id,
          reviewerName: reviewerActor.name,
          reviewerRole: reviewerActor.role,
          comments: 'Premature approval attempt without correcting contradictions.',
          timestamp: new Date().toISOString(),
        },
        reviewerActor
      )
    ).rejects.toThrow(ValidationError)
  })

  it('rejects approval decisions submitted by actors with role Creator', async () => {
    await expect(
      approvalService.processDecision(
        'REV-2025-089',
        {
          decision: 'approved',
          reviewerId: creatorActor.id,
          reviewerName: creatorActor.name,
          reviewerRole: creatorActor.role,
          comments: 'Creator attempting self-approval.',
          timestamp: new Date().toISOString(),
        },
        creatorActor
      )
    ).rejects.toThrow(ValidationError)
  })

  it('permits request for changes even when contradictions exist', async () => {
    const updated = await approvalService.processDecision(
      'REV-2025-089',
      {
        decision: 'changes_requested',
        reviewerId: reviewerActor.id,
        reviewerName: reviewerActor.name,
        reviewerRole: reviewerActor.role,
        comments: 'Slide 1 and 2 require softening of absolute claims.',
        timestamp: new Date().toISOString(),
      },
      reviewerActor
    )

    expect(updated.status).toBe('changes_requested')
    expect(updated.approvalDecision?.decision).toBe('changes_requested')
  })
})
