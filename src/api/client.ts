import { mockStorage } from './mock/adapter'
import {
  BrandDocument,
  ReviewDraft,
  AuditEvent,
  GovernanceAnalytics,
  Workspace,
  User,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
// Isolate demo mocks behind explicit development-only setting
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface ApiConfigStatus {
  isDemoMode: boolean
  baseUrl: string
  mockActive: boolean
  lastChecked: string
}

export const getApiConfigStatus = (): ApiConfigStatus => {
  return {
    isDemoMode: USE_MOCK,
    baseUrl: API_BASE_URL || (USE_MOCK ? 'Local Mock Engine (Offline-Ready)' : 'Express Backend (/api)'),
    mockActive: USE_MOCK,
    lastChecked: new Date().toISOString(),
  }
}

// Generic HTTP helper for when connected to Express backend
async function fetchFromBackend<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const base = API_BASE_URL ? API_BASE_URL.replace(/\/$/, '') : ''
  const url = `${base}/${endpoint.replace(/^\//, '')}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(
      errorBody.error || errorBody.message || `API Request failed with status ${response.status}: ${response.statusText}`
    )
  }

  return response.json()
}

// 1. Workspace & Auth Services
export const authService = {
  async getCurrentUser(): Promise<User> {
    if (USE_MOCK) return mockStorage.getCurrentUser()
    return fetchFromBackend<User>('/api/auth/me')
  },

  async switchUser(userId: string): Promise<User> {
    if (USE_MOCK) return mockStorage.setCurrentUser(userId)
    return fetchFromBackend<User>('/api/auth/switch', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  async getAllUsers(): Promise<User[]> {
    if (USE_MOCK) return mockStorage.getAllUsers()
    return fetchFromBackend<User[]>('/api/users')
  },

  async getWorkspaces(): Promise<Workspace[]> {
    if (USE_MOCK) return mockStorage.getWorkspaces()
    return fetchFromBackend<Workspace[]>('/api/workspaces')
  },

  async getCurrentWorkspace(): Promise<Workspace> {
    if (USE_MOCK) return mockStorage.getCurrentWorkspace()
    return fetchFromBackend<Workspace>('/api/workspaces/current')
  },

  async switchWorkspace(workspaceId: string): Promise<Workspace> {
    if (USE_MOCK) return mockStorage.setWorkspace(workspaceId)
    return fetchFromBackend<Workspace>('/api/workspaces/switch', {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    })
  },
}

// 2. Brand Knowledge & Guideline Document Services
export const documentService = {
  async getDocuments(params?: {
    search?: string
    category?: string
    status?: string
  }): Promise<BrandDocument[]> {
    if (USE_MOCK) return mockStorage.getDocuments(params)
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchFromBackend<BrandDocument[]>(`/api/documents?${query}`)
  },

  async getDocumentById(id: string): Promise<BrandDocument | null> {
    if (USE_MOCK) return mockStorage.getDocumentById(id)
    return fetchFromBackend<BrandDocument>(`/api/documents/${id}`)
  },

  async uploadDocument(
    file: File,
    metadata: { category: BrandDocument['category']; name?: string; version?: string }
  ): Promise<BrandDocument> {
    if (USE_MOCK) return mockStorage.uploadDocument(file, metadata)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', metadata.category)
    if (metadata.name) formData.append('name', metadata.name)
    if (metadata.version) formData.append('version', metadata.version)

    const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Upload failed')
    return response.json()
  },

  async archiveDocument(id: string): Promise<BrandDocument> {
    if (USE_MOCK) return mockStorage.archiveDocument(id)
    return fetchFromBackend<BrandDocument>(`/api/documents/${id}/archive`, {
      method: 'PATCH',
    })
  },

  async deleteDocument(id: string): Promise<boolean> {
    if (USE_MOCK) return mockStorage.deleteDocument(id)
    return fetchFromBackend<{ success: boolean }>(`/api/documents/${id}`, {
      method: 'DELETE',
    }).then((res) => res.success)
  },
}

// 3. Content Review & Findings Services
export const reviewService = {
  async getReviews(params?: {
    status?: string
    contentType?: string
    search?: string
  }): Promise<ReviewDraft[]> {
    if (USE_MOCK) return mockStorage.getReviews(params)
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return fetchFromBackend<ReviewDraft[]>(`/api/reviews?${query}`)
  },

  async getReviewById(id: string): Promise<ReviewDraft | null> {
    if (USE_MOCK) return mockStorage.getReviewById(id)
    return fetchFromBackend<ReviewDraft>(`/api/reviews/${id}`)
  },

  async submitReview(submission: {
    title: string
    contentType: ReviewDraft['contentType']
    campaignName?: string
    content: string
    guidelineDocumentIds: string[]
  }): Promise<ReviewDraft> {
    if (USE_MOCK) return mockStorage.createReview(submission)
    return fetchFromBackend<ReviewDraft>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(submission),
    })
  },

  async applySuggestion(
    reviewId: string,
    findingId: string,
    customText?: string
  ): Promise<ReviewDraft> {
    if (USE_MOCK) return mockStorage.applySuggestion(reviewId, findingId, customText)
    return fetchFromBackend<ReviewDraft>(`/api/reviews/${reviewId}/suggestions/${findingId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ customText }),
    })
  },

  async rejectSuggestion(reviewId: string, findingId: string): Promise<ReviewDraft> {
    if (USE_MOCK) return mockStorage.rejectSuggestion(reviewId, findingId)
    return fetchFromBackend<ReviewDraft>(`/api/reviews/${reviewId}/suggestions/${findingId}/reject`, {
      method: 'POST',
    })
  },

  async updateDraftText(reviewId: string, newText: string): Promise<ReviewDraft> {
    if (USE_MOCK) return mockStorage.updateReviewDraftText(reviewId, newText)
    return fetchFromBackend<ReviewDraft>(`/api/reviews/${reviewId}/draft`, {
      method: 'PATCH',
      body: JSON.stringify({ text: newText }),
    })
  },

  async submitApprovalDecision(
    reviewId: string,
    decision: 'approved' | 'changes_requested' | 'rejected',
    comments: string
  ): Promise<ReviewDraft> {
    if (USE_MOCK) return mockStorage.submitApprovalDecision(reviewId, decision, comments)
    return fetchFromBackend<ReviewDraft>(`/api/reviews/${reviewId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, comments }),
    })
  },
}

// 4. Audit Trail Services
export const auditService = {
  async getAuditEvents(filter?: {
    actionType?: string
    userId?: string
    reviewId?: string
    search?: string
  }): Promise<AuditEvent[]> {
    if (USE_MOCK) return mockStorage.getAuditEvents(filter)
    const query = new URLSearchParams(filter as Record<string, string>).toString()
    return fetchFromBackend<AuditEvent[]>(`/api/audit?${query}`)
  },
}

// 5. Governance Analytics Services
export const analyticsService = {
  async getAnalytics(timeframe = '30d'): Promise<GovernanceAnalytics> {
    if (USE_MOCK) return mockStorage.getGovernanceAnalytics(timeframe)
    return fetchFromBackend<GovernanceAnalytics>(`/api/analytics?timeframe=${timeframe}`)
  },
}

// 6. Reset tool for live demo
export const resetDemoData = () => {
  mockStorage.resetAllData()
}
