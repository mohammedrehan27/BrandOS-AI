import { Workspace, UserProfile } from '../../types'
import { getSupabaseClient } from '../supabase'
import { env, getServiceConfigStatus } from '../../config/env'
import { ServiceNotConfiguredError, NotFoundError } from '../../services/errors'

// In-memory development storage (isolated to development fallback mode)
let devWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Acme Health Technologies',
    slug: 'acme-health',
    industry: 'Nutraceuticals & BioTech',
    activeDocumentCount: 5,
    totalReviewsCount: 4,
    complianceScore: 58,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'ws-2',
    name: 'TechNova Cloud Systems',
    slug: 'technova-cloud',
    industry: 'Enterprise SaaS & AI',
    activeDocumentCount: 3,
    totalReviewsCount: 19,
    complianceScore: 88,
    createdAt: '2026-02-15T09:30:00Z',
  },
  {
    id: 'ws-3',
    name: 'FinGuard Global Trust',
    slug: 'finguard-global',
    industry: 'FinTech & Banking',
    activeDocumentCount: 6,
    totalReviewsCount: 52,
    complianceScore: 96,
    createdAt: '2026-03-01T11:00:00Z',
  },
]

let devUsers: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Elena Rostova',
    email: 'elena.rostova@acmehealth.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'Brand Manager',
    workspaceId: 'ws-1',
  },
  {
    id: 'usr-2',
    name: 'Marcus Vance',
    email: 'marcus.vance@acmehealth.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'Reviewer',
    workspaceId: 'ws-1',
  },
  {
    id: 'usr-3',
    name: 'Sophia Chen',
    email: 'sophia.chen@acmehealth.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    role: 'Creator',
    workspaceId: 'ws-1',
  },
]

let currentActiveWorkspaceId = 'ws-1'
let currentActiveUserId = 'usr-1'

export const workspaceRepo = {
  async getWorkspaces(): Promise<Workspace[]> {
    const client = getSupabaseClient()
    if (client) {
      const { data, error } = await client.from('workspaces').select('*').order('name')
      if (error) throw new Error(`Database error fetching workspaces: ${error.message}`)
      return data || []
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    return [...devWorkspaces]
  },

  async getWorkspaceById(id: string): Promise<Workspace> {
    const client = getSupabaseClient()
    if (client) {
      const { data, error } = await client.from('workspaces').select('*').eq('id', id).single()
      if (error || !data) throw new NotFoundError('Workspace', id)
      return data
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    const ws = devWorkspaces.find((w) => w.id === id)
    if (!ws) throw new NotFoundError('Workspace', id)
    return { ...ws }
  },

  async getCurrentWorkspace(): Promise<Workspace> {
    return this.getWorkspaceById(currentActiveWorkspaceId)
  },

  async switchWorkspace(id: string): Promise<Workspace> {
    const ws = await this.getWorkspaceById(id)
    currentActiveWorkspaceId = ws.id
    return ws
  },

  async getUsers(workspaceId?: string): Promise<UserProfile[]> {
    const targetWs = workspaceId || currentActiveWorkspaceId
    const client = getSupabaseClient()
    if (client) {
      let query = client.from('profiles').select('*')
      if (targetWs) query = query.eq('workspace_id', targetWs)
      const { data, error } = await query
      if (error) throw new Error(`Database error fetching users: ${error.message}`)
      return data || []
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    return devUsers.filter((u) => !targetWs || u.workspaceId === targetWs)
  },

  async getUserById(id: string): Promise<UserProfile> {
    const client = getSupabaseClient()
    if (client) {
      const { data, error } = await client.from('profiles').select('*').eq('id', id).single()
      if (error || !data) throw new NotFoundError('UserProfile', id)
      return data
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    const user = devUsers.find((u) => u.id === id)
    if (!user) throw new NotFoundError('UserProfile', id)
    return { ...user }
  },

  async getCurrentUser(): Promise<UserProfile> {
    return this.getUserById(currentActiveUserId)
  },

  async switchUser(id: string): Promise<UserProfile> {
    const user = await this.getUserById(id)
    currentActiveUserId = user.id
    return user
  },
}
