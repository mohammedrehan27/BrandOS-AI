import { AuditEvent, AuditEventType } from '../../types'
import { getSupabaseClient } from '../supabase'
import { env, getServiceConfigStatus } from '../../config/env'
import { ServiceNotConfiguredError } from '../../services/errors'

let devAuditEvents: AuditEvent[] = [
  {
    id: 'aud-108',
    workspaceId: 'ws-1',
    timestamp: '2026-10-25T09:15:00Z',
    actionType: 'finding_generated',
    actor: {
      id: 'sys-ai',
      name: 'BrandOS Governance Engine',
      email: 'engine@brandos.internal',
      role: 'Automated System',
    },
    targetType: 'review',
    targetId: 'REV-2025-089',
    targetTitle: 'ImmunoShield Pro Hero & Features Landing Page Copy',
    summary:
      'Analyzed draft against 4 active guideline documents; generated 4 evidence-backed findings (2 Contradicted, 1 Needs Verification, 1 Verified).',
    metadata: {
      guidelinesUsed: 4,
      processingDurationMs: 1420,
    },
  },
  {
    id: 'aud-107',
    workspaceId: 'ws-1',
    timestamp: '2026-10-24T14:22:00Z',
    actionType: 'draft_submitted',
    actor: {
      id: 'usr-3',
      name: 'Sophia Chen',
      email: 'sophia.chen@acmehealth.com',
      role: 'Creator',
    },
    targetType: 'review',
    targetId: 'REV-2025-089',
    targetTitle: 'ImmunoShield Pro Hero & Features Landing Page Copy',
    summary: 'Submitted new landing page copy draft for pre-flight compliance governance.',
    metadata: {
      wordCount: 88,
      contentType: 'landing_page',
    },
  },
  {
    id: 'aud-106',
    workspaceId: 'ws-1',
    timestamp: '2026-10-23T16:45:00Z',
    actionType: 'revisions_requested',
    actor: {
      id: 'usr-2',
      name: 'Marcus Vance',
      email: 'marcus.vance@acmehealth.com',
      role: 'Reviewer',
    },
    targetType: 'review',
    targetId: 'REV-2025-074',
    targetTitle: 'Q3 Paid Instagram Carousel — Clinical Defense Series',
    summary: 'Requested revisions: Prohibited disease prevention claims detected in Slide 2.',
    metadata: {
      decision: 'changes_requested',
    },
  },
  {
    id: 'aud-105',
    workspaceId: 'ws-1',
    timestamp: '2026-10-19T14:10:00Z',
    actionType: 'approval_decision',
    actor: {
      id: 'usr-2',
      name: 'Marcus Vance',
      email: 'marcus.vance@acmehealth.com',
      role: 'Reviewer',
    },
    targetType: 'review',
    targetId: 'REV-2025-061',
    targetTitle: 'Healthcare Professional Email Announcement: Q4 Advisory',
    summary: 'Approved HCP email draft after confirming all claims align with DSHEA guidelines.',
    metadata: {
      decision: 'approved',
    },
  },
  {
    id: 'aud-104',
    workspaceId: 'ws-1',
    timestamp: '2026-09-14T10:30:00Z',
    actionType: 'document_indexed',
    actor: {
      id: 'usr-1',
      name: 'Elena Rostova',
      email: 'elena.rostova@acmehealth.com',
      role: 'Brand Manager',
    },
    targetType: 'document',
    targetId: 'doc-1',
    targetTitle: 'Acme Clinical Marketing Guidelines 2025 (v2.1)',
    summary: 'Uploaded and indexed 34 guideline pages; extracted 42 enforceable brand rules.',
    metadata: {
      pageCount: 34,
      version: 'v2.1',
    },
  },
]

export const auditRepo = {
  async getAuditEvents(filter?: {
    actionType?: string
    userId?: string
    reviewId?: string
    search?: string
    workspaceId?: string
  }): Promise<AuditEvent[]> {
    const client = getSupabaseClient()
    if (client) {
      let query = client.from('audit_events').select('*')
      if (filter?.workspaceId) {
        query = query.eq('workspace_id', filter.workspaceId)
      }
      if (filter?.actionType && filter.actionType !== 'all') {
        query = query.eq('action_type', filter.actionType)
      }
      if (filter?.userId && filter.userId !== 'all') {
        query = query.eq('actor_id', filter.userId)
      }
      if (filter?.reviewId) {
        query = query.eq('target_id', filter.reviewId)
      }
      if (filter?.search) {
        query = query.ilike('summary', `%${filter.search}%`)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw new Error(`Database error fetching audit events: ${error.message}`)

      return (data || []).map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        timestamp: row.created_at,
        actionType: row.action_type,
        actor: {
          id: row.actor_id,
          name: row.actor_name,
          email: row.actor_email,
          role: row.actor_role,
        },
        targetType: row.target_type,
        targetId: row.target_id,
        targetTitle: row.target_title,
        summary: row.summary,
        metadata: row.metadata || {},
      }))
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    let list = [...devAuditEvents]
    if (filter?.workspaceId) {
      list = list.filter((e) => (e.workspaceId || 'ws-1') === filter.workspaceId)
    }
    if (filter?.actionType && filter.actionType !== 'all') {
      list = list.filter((e) => e.actionType === filter.actionType)
    }
    if (filter?.userId && filter.userId !== 'all') {
      list = list.filter((e) => e.actor.id === filter.userId)
    }
    if (filter?.reviewId) {
      list = list.filter((e) => e.targetId === filter.reviewId)
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      list = list.filter(
        (e) =>
          e.summary.toLowerCase().includes(q) ||
          e.targetTitle.toLowerCase().includes(q) ||
          e.actor.name.toLowerCase().includes(q)
      )
    }
    return list
  },

  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      workspaceId: event.workspaceId || 'ws-1',
      ...event,
    }

    const client = getSupabaseClient()
    if (client) {
      const { error } = await client.from('audit_events').insert({
        workspace_id: newEvent.workspaceId || 'ws-1',
        action_type: newEvent.actionType,
        actor_id: newEvent.actor.id,
        actor_name: newEvent.actor.name,
        actor_email: newEvent.actor.email,
        actor_role: newEvent.actor.role,
        target_type: newEvent.targetType,
        target_id: newEvent.targetId,
        target_title: newEvent.targetTitle,
        summary: newEvent.summary,
        metadata: newEvent.metadata || {},
      })
      if (error) throw new Error(`Database error recording audit event: ${error.message}`)
      return newEvent
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    devAuditEvents.unshift(newEvent)
    return newEvent
  },
}
