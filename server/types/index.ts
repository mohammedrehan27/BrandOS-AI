export type UserRole = 'Brand Manager' | 'Reviewer' | 'Creator'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  workspaceId: string
  createdAt?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo?: string
  industry: string
  activeDocumentCount: number
  totalReviewsCount: number
  complianceScore: number
  createdAt?: string
}

export type DocumentCategory =
  | 'Clinical & Efficacy'
  | 'Legal & Regulatory'
  | 'Product Specifications'
  | 'Tone of Voice'
  | 'ESG & Sustainability'
  | 'Trademark & IP'

export type ProcessingStatus = 'indexed' | 'processing' | 'failed'
export type DocumentStatus = 'active' | 'archived'

export interface DocumentSection {
  id: string
  documentId?: string
  pageNumber: number
  heading: string
  ruleCount: number
  summary: string
  extractedText: string
  keywords?: string[]
  embedding?: number[]
}

export interface BrandDocument {
  id: string
  workspaceId?: string
  name: string
  originalFileName: string
  category: DocumentCategory
  version: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  status: DocumentStatus
  processingStatus: ProcessingStatus
  pageCount: number
  extractedRulesCount: number
  summary: string
  fileUrl?: string
  sections: DocumentSection[]
}

export type ContentType =
  | 'advertisement'
  | 'social_post'
  | 'landing_page'
  | 'email'
  | 'product_description'
  | 'press_release'

export type ReviewStatus =
  | 'pending'
  | 'in_progress'
  | 'changes_requested'
  | 'ready_for_approval'
  | 'approved'
  | 'rejected'

export type FindingStatus = 'verified' | 'contradicted' | 'needs_verification'
export type FindingSeverity = 'high' | 'medium' | 'low'
export type SuggestionStatus = 'unapplied' | 'applied' | 'edited' | 'rejected'

export interface EvidencePassage {
  documentId: string
  documentName: string
  documentVersion: string
  pageNumber: number
  sectionHeading: string
  verbatimPassage: string
  citationId: string
  relevanceScore: number
}

export interface Finding {
  id: string
  draftId: string
  claimText: string
  startIndex: number
  endIndex: number
  status: FindingStatus
  severity: FindingSeverity
  brandRuleId: string
  brandRuleTitle: string
  explanation: string
  confidenceScore: number
  suggestedCorrection?: string
  suggestionStatus?: SuggestionStatus
  editedCorrection?: string
  evidence: EvidencePassage
}

export interface ApprovalDecision {
  decision: 'approved' | 'changes_requested' | 'rejected'
  reviewerId: string
  reviewerName: string
  reviewerRole: string
  comments: string
  timestamp: string
}

export interface ReviewDraft {
  id: string
  title: string
  contentType: ContentType
  campaignName?: string
  workspaceId: string
  submittedBy: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  submittedAt: string
  updatedAt: string
  originalText: string
  currentText: string
  guidelineDocumentIds: string[]
  status: ReviewStatus
  approvalDecision?: ApprovalDecision
  findings: Finding[]
  stats: {
    totalClaims: number
    verified: number
    contradicted: number
    needsVerification: number
    highSeverityCount: number
  }
}

export type AuditEventType =
  | 'draft_submitted'
  | 'draft_edited'
  | 'guidelines_applied'
  | 'review_started'
  | 'review_completed'
  | 'finding_generated'
  | 'suggestion_accepted'
  | 'suggestion_edited'
  | 'suggestion_rejected'
  | 'comment_added'
  | 'approval_decision'
  | 'rejection_decision'
  | 'revisions_requested'
  | 'document_uploaded'
  | 'document_archived'
  | 'document_indexed'

export interface AuditEvent {
  id: string
  workspaceId?: string
  timestamp: string
  actionType: AuditEventType
  actor: {
    id: string
    name: string
    email: string
    role: string
  }
  targetType: 'review' | 'document' | 'workspace' | 'finding'
  targetId: string
  targetTitle: string
  summary: string
  metadata?: Record<string, any>
}

export interface GovernanceAnalytics {
  totalReviews: number
  verifiedClaims: number
  flaggedFindings: number
  pendingApprovals: number
  avgReviewTimeMinutes: number
  complianceRatePercent: number
  categoryBreakdown: {
    category: string
    count: number
    high: number
    medium: number
    low: number
  }[]
  statusBreakdown: {
    name: string
    value: number
    color: string
  }[]
  weeklyTrend: {
    date: string
    verified: number
    contradicted: number
    needsVerification: number
  }[]
  recurringViolations: {
    rule: string
    count: number
    category: string
    severity: FindingSeverity
  }[]
  flaggedTerminology: {
    term: string
    count: number
    category: string
    suggestedAlternative: string
  }[]
  reviewerDecisions: {
    decision: string
    count: number
    percentage: number
  }[]
}
