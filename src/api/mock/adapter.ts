import {
  BrandDocument,
  ReviewDraft,
  AuditEvent,
  GovernanceAnalytics,
  Workspace,
  User,
  Finding,
  ApprovalDecision,
} from '@/types'
import {
  INITIAL_DOCUMENTS,
  INITIAL_REVIEWS,
  INITIAL_AUDIT_EVENTS,
  INITIAL_ANALYTICS,
  WORKSPACES,
  DEFAULT_USERS,
} from './data'
import { calculateGovernanceMetrics } from '@/lib/metrics'

const STORAGE_KEYS = {
  DOCUMENTS: 'brandos_documents_v1',
  REVIEWS: 'brandos_reviews_v1',
  AUDIT: 'brandos_audit_v1',
  CURRENT_USER: 'brandos_current_user_v1',
  CURRENT_WORKSPACE: 'brandos_current_workspace_v1',
}

class MockStorageAdapter {
  private documents: BrandDocument[] = []
  private reviews: ReviewDraft[] = []
  private auditEvents: AuditEvent[] = []
  private currentUser: User = DEFAULT_USERS[0]
  private currentWorkspace: Workspace = WORKSPACES[0]

  constructor() {
    this.init()
  }

  private init() {
    try {
      const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS)
      this.documents = savedDocs ? JSON.parse(savedDocs) : INITIAL_DOCUMENTS

      const savedReviews = localStorage.getItem(STORAGE_KEYS.REVIEWS)
      this.reviews = savedReviews ? JSON.parse(savedReviews) : INITIAL_REVIEWS

      const savedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT)
      this.auditEvents = savedAudit ? JSON.parse(savedAudit) : INITIAL_AUDIT_EVENTS

      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser)
      }

      const savedWs = localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE)
      if (savedWs) {
        this.currentWorkspace = JSON.parse(savedWs)
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial mock data', e)
      this.documents = [...INITIAL_DOCUMENTS]
      this.reviews = [...INITIAL_REVIEWS]
      this.auditEvents = [...INITIAL_AUDIT_EVENTS]
      this.currentUser = DEFAULT_USERS[0]
      this.currentWorkspace = WORKSPACES[0]
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this.documents))
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(this.reviews))
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(this.auditEvents))
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser))
      localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(this.currentWorkspace))
    } catch (e) {
      console.warn('Failed to persist to localStorage', e)
    }
  }

  // Workspaces & Users
  async getWorkspaces(): Promise<Workspace[]> {
    return [...WORKSPACES]
  }

  async getCurrentWorkspace(): Promise<Workspace> {
    return this.currentWorkspace
  }

  async setWorkspace(workspaceId: string): Promise<Workspace> {
    const ws = WORKSPACES.find((w) => w.id === workspaceId) || WORKSPACES[0]
    this.currentWorkspace = ws
    this.persist()
    return ws
  }

  async getCurrentUser(): Promise<User> {
    return this.currentUser
  }

  async setCurrentUser(userId: string): Promise<User> {
    const usr = DEFAULT_USERS.find((u) => u.id === userId) || DEFAULT_USERS[0]
    this.currentUser = usr
    this.persist()
    return usr
  }

  async getAllUsers(): Promise<User[]> {
    return [...DEFAULT_USERS]
  }

  // Documents
  async getDocuments(params?: {
    search?: string
    category?: string
    status?: string
  }): Promise<BrandDocument[]> {
    let list = [...this.documents]
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.originalFileName.toLowerCase().includes(q)
      )
    }
    if (params?.category && params.category !== 'all') {
      list = list.filter((d) => d.category === params.category)
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((d) => d.status === params.status)
    }
    return list
  }

  async getDocumentById(id: string): Promise<BrandDocument | null> {
    const doc = this.documents.find((d) => d.id === id)
    return doc ? { ...doc } : null
  }

  async uploadDocument(
    file: File,
    metadata: { category: BrandDocument['category']; name?: string; version?: string }
  ): Promise<BrandDocument> {
    // Generate new document entry
    const newDocId = `doc-${Date.now()}`
    const pageCount = Math.floor(Math.random() * 25) + 8
    const ruleCount = Math.floor(Math.random() * 20) + 12
    const docName = metadata.name || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')

    const newDoc: BrandDocument = {
      id: newDocId,
      name: docName,
      originalFileName: file.name,
      category: metadata.category,
      version: metadata.version || 'v1.0',
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: this.currentUser.name,
      status: 'active',
      processingStatus: 'indexed',
      pageCount,
      extractedRulesCount: ruleCount,
      summary: `Uploaded and indexed guideline document containing ${ruleCount} parsed brand compliance rules for ${metadata.category}.`,
      sections: [
        {
          id: `sec-${newDocId}-1`,
          pageNumber: 1,
          heading: 'Section 1: General Brand Scope & Enforceability',
          ruleCount: Math.ceil(ruleCount / 2),
          summary: 'Foundation guardrails and compliance baseline requirements.',
          extractedText: `All public-facing communications must be vetted against corporate brand standards. Unauthorized assertions, non-certified sustainability declarations, and unverified efficacy statements are subject to mandatory revision before external distribution.`,
        },
        {
          id: `sec-${newDocId}-2`,
          pageNumber: Math.max(2, Math.floor(pageCount / 2)),
          heading: 'Section 2: Claims Verification & Substantiation Protocol',
          ruleCount: Math.floor(ruleCount / 2),
          summary: 'Specific evidentiary thresholds and acceptable phraseology.',
          extractedText: `Claims citing clinical trial results, percentage improvements, or speed of action must specify trial sample size (minimum N=100) and link to verified Certificates of Analysis or registered trial numbers.`,
        },
      ],
    }

    this.documents.unshift(newDoc)

    // Audit log
    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'document_indexed',
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'document',
      targetId: newDoc.id,
      targetTitle: newDoc.name,
      summary: `Indexed brand guideline document "${newDoc.name}" (${newDoc.version}); parsed ${ruleCount} enforceable rules.`,
      metadata: {
        fileSize: file.size,
        category: metadata.category,
        pageCount,
      },
    })

    this.persist()
    return newDoc
  }

  async archiveDocument(id: string): Promise<BrandDocument> {
    const doc = this.documents.find((d) => d.id === id)
    if (!doc) throw new Error('Document not found')
    doc.status = doc.status === 'active' ? 'archived' : 'active'

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'document_archived',
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'document',
      targetId: doc.id,
      targetTitle: doc.name,
      summary: `Changed document status of "${doc.name}" to ${doc.status}.`,
    })

    this.persist()
    return { ...doc }
  }

  async deleteDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex((d) => d.id === id)
    if (index === -1) return false
    const removed = this.documents.splice(index, 1)[0]

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'document_archived',
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'document',
      targetId: removed.id,
      targetTitle: removed.name,
      summary: `Permanently removed brand document "${removed.name}".`,
    })

    this.persist()
    return true
  }

  // Reviews
  async getReviews(params?: {
    status?: string
    contentType?: string
    search?: string
  }): Promise<ReviewDraft[]> {
    let list = [...this.reviews]
    if (params?.status && params.status !== 'all') {
      list = list.filter((r) => r.status === params.status)
    }
    if (params?.contentType && params.contentType !== 'all') {
      list = list.filter((r) => r.contentType === params.contentType)
    }
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.submittedBy.name.toLowerCase().includes(q)
      )
    }
    return list
  }

  async getReviewById(id: string): Promise<ReviewDraft | null> {
    const r = this.reviews.find((item) => item.id === id)
    return r ? { ...r } : null
  }

  async createReview(submission: {
    title: string
    contentType: ReviewDraft['contentType']
    campaignName?: string
    content: string
    guidelineDocumentIds: string[]
  }): Promise<ReviewDraft> {
    const reviewId = `REV-2025-${Math.floor(100 + Math.random() * 900)}`
    const content = submission.content.trim()

    // Analyze content against active guidelines to construct findings
    const findings: Finding[] = []

    // Pattern 1: Absolute guarantees / 100% cure / immunity
    const absoluteMatch = content.match(
      /(guaranteed\s+(?:100%|cure|immunity)[^.,;\n]*|cures?[^.,;\n]*|100%\s+protection[^.,;\n]*|eliminates?[^.,;\n]*)/i
    )
    if (absoluteMatch && absoluteMatch.index !== undefined) {
      findings.push({
        id: `fnd-${Date.now()}-1`,
        draftId: reviewId,
        claimText: absoluteMatch[0],
        startIndex: absoluteMatch.index,
        endIndex: absoluteMatch.index + absoluteMatch[0].length,
        status: 'contradicted',
        severity: 'high',
        brandRuleId: 'RULE-3.1',
        brandRuleTitle: 'Prohibition of Absolute Protection & Cure Claims',
        explanation:
          'Absolute health and immunity claims violate FDA 21 CFR §101.93 and Section 2.4 of the Clinical Marketing Guidelines. Permitted language must reflect structure/function support.',
        confidenceScore: 98,
        suggestedCorrection: 'formulated to support healthy natural defenses and daily resilience',
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-1',
          documentName: 'Acme Clinical Marketing Guidelines 2025',
          documentVersion: 'v2.1',
          pageNumber: 12,
          sectionHeading: 'Section 2.4: Efficacy Limitations & Absolute Statements',
          citationId: 'CIT-DOC1-P12-S2.4',
          relevanceScore: 99,
          verbatimPassage:
            'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR §101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses".',
        },
      })
    }

    // Pattern 2: Institutional names (Mayo, Harvard, Hopkins, Stanford)
    const instMatch = content.match(
      /(clinically proven by\s+[^.,;\n]*|Mayo Clinic|Harvard|Johns Hopkins|Stanford|hospital researchers[^.,;\n]*)/i
    )
    if (instMatch && instMatch.index !== undefined) {
      findings.push({
        id: `fnd-${Date.now()}-2`,
        draftId: reviewId,
        claimText: instMatch[0],
        startIndex: instMatch.index,
        endIndex: instMatch.index + instMatch[0].length,
        status: 'contradicted',
        severity: 'high',
        brandRuleId: 'RULE-4.8',
        brandRuleTitle: 'Unauthorized Academic/Clinical Co-Branding',
        explanation:
          'Specific clinical institutions may never be cited without formal executed review board agreements on file.',
        confidenceScore: 96,
        suggestedCorrection:
          'Evaluated in independent randomized double-blind clinical trials published in peer-reviewed scientific journals',
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-1',
          documentName: 'Acme Clinical Marketing Guidelines 2025',
          documentVersion: 'v2.1',
          pageNumber: 19,
          sectionHeading: 'Section 4.2: Institutional Co-branding & Research Affiliations',
          citationId: 'CIT-DOC1-P19-S4.2',
          relevanceScore: 97,
          verbatimPassage:
            'RULE 4.8: Specific academic or medical institutional endorsements (such as Mayo Clinic, Harvard, Johns Hopkins) may never be cited without formal executed institutional review board agreements and corporate legal sign-off. References must describe study protocols generally.',
        },
      })
    }

    // Pattern 3: Environmental / Zero-carbon claims
    const esgMatch = content.match(
      /(zero-carbon[^.,;\n]*|100%\s+eco-friendly[^.,;\n]*|net-zero\s+emissions[^.,;\n]*|carbon-neutral\s+production[^.,;\n]*)/i
    )
    if (esgMatch && esgMatch.index !== undefined) {
      findings.push({
        id: `fnd-${Date.now()}-3`,
        draftId: reviewId,
        claimText: esgMatch[0],
        startIndex: esgMatch.index,
        endIndex: esgMatch.index + esgMatch[0].length,
        status: 'needs_verification',
        severity: 'medium',
        brandRuleId: 'RULE-7.2',
        brandRuleTitle: 'Environmental & Zero-Carbon Claims Substantiation',
        explanation:
          'Unqualified environmental assertions require active ISO-14064 verified Life Cycle Assessment disclosure records.',
        confidenceScore: 91,
        suggestedCorrection:
          'sustainably harvested using energy-efficient cold extraction with verified carbon offset credits',
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-4',
          documentName: 'Global ESG & Sustainability Claims Standard',
          documentVersion: 'v1.2',
          pageNumber: 8,
          sectionHeading: 'Section 1.3: Carbon Footprint & Environmental Claims',
          citationId: 'CIT-DOC4-P8-S1.3',
          relevanceScore: 92,
          verbatimPassage:
            'RULE 7.2: Unqualified claims such as "100% zero-carbon" or "completely emission-free" are prohibited without a specific third-party ISO-14064 verified Life Cycle Assessment (LCA) identifier published in public brand disclosures.',
        },
      })
    }

    // Pattern 4: Verified ingredients / polyphenols / vitamins / extracts
    const verifiedMatch = content.match(
      /(standardized to\s+[^.,;\n]*|bio-fermented zinc[^.,;\n]*|elderberry\s+extract[^.,;\n]*|clinically-backed[^.,;\n]*)/i
    )
    if (verifiedMatch && verifiedMatch.index !== undefined) {
      findings.push({
        id: `fnd-${Date.now()}-4`,
        draftId: reviewId,
        claimText: verifiedMatch[0],
        startIndex: verifiedMatch.index,
        endIndex: verifiedMatch.index + verifiedMatch[0].length,
        status: 'verified',
        severity: 'low',
        brandRuleId: 'RULE-1.4',
        brandRuleTitle: 'Active Ingredient & Specification Verification',
        explanation:
          'Active ingredient claim accurately matches the registered raw material master specification and COA batch standards.',
        confidenceScore: 99,
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-3',
          documentName: 'Product Specifications: ImmunoShield Pro',
          documentVersion: 'v3.0',
          pageNumber: 4,
          sectionHeading: 'Section 1.2: Active Bio-Available Potency Spec',
          citationId: 'CIT-DOC3-P4-S1.2',
          relevanceScore: 98,
          verbatimPassage:
            'ImmunoShield Pro delivers 15mg elemental zinc in high-absorption bisglycinate chelate form combined with 450mg European Black Elderberry standardized to 45% total polyphenols. Batch analysis confirms allergen-free and vegan certification.',
        },
      })
    }

    // If no specific patterns matched, provide a standard verified + warning finding
    if (findings.length === 0) {
      findings.push({
        id: `fnd-${Date.now()}-gen`,
        draftId: reviewId,
        claimText: content.slice(0, Math.min(60, content.length)),
        startIndex: 0,
        endIndex: Math.min(60, content.length),
        status: 'verified',
        severity: 'low',
        brandRuleId: 'RULE-1.1',
        brandRuleTitle: 'General Marketing Copy Baseline Verification',
        explanation: 'Introductory claims align with approved brand voice and clinical positioning.',
        confidenceScore: 94,
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-1',
          documentName: 'Acme Clinical Marketing Guidelines 2025',
          documentVersion: 'v2.1',
          pageNumber: 5,
          sectionHeading: 'Section 1.1: Standardized Active Ingredients & Potency',
          citationId: 'CIT-DOC1-P5-S1.1',
          relevanceScore: 95,
          verbatimPassage:
            'All finished products must cite standardized extract levels verified by valid Certificate of Analysis (COA).',
        },
      })
    }

    const verifiedCount = findings.filter((f) => f.status === 'verified').length
    const contradictedCount = findings.filter((f) => f.status === 'contradicted').length
    const needsVerificationCount = findings.filter((f) => f.status === 'needs_verification').length
    const highSeverityCount = findings.filter((f) => f.severity === 'high').length

    const newReview: ReviewDraft = {
      id: reviewId,
      title: submission.title,
      contentType: submission.contentType,
      campaignName: submission.campaignName,
      workspaceId: this.currentWorkspace.id,
      submittedBy: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        avatar: this.currentUser.avatar,
      },
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalText: content,
      currentText: content,
      guidelineDocumentIds: submission.guidelineDocumentIds,
      status: 'ready_for_approval',
      findings,
      stats: {
        totalClaims: findings.length,
        verified: verifiedCount,
        contradicted: contradictedCount,
        needsVerification: needsVerificationCount,
        highSeverityCount,
      },
    }

    this.reviews.unshift(newReview)

    // Audit logs
    this.auditEvents.unshift({
      id: `aud-${Date.now()}-sub`,
      timestamp: new Date().toISOString(),
      actionType: 'draft_submitted',
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'review',
      targetId: newReview.id,
      targetTitle: newReview.title,
      summary: `Submitted marketing draft for compliance review against ${submission.guidelineDocumentIds.length} guideline files.`,
    })

    this.auditEvents.unshift({
      id: `aud-${Date.now()}-rev`,
      timestamp: new Date().toISOString(),
      actionType: 'finding_generated',
      actor: {
        id: 'sys-ai',
        name: 'BrandOS Governance Engine',
        email: 'engine@brandos.internal',
        role: 'Automated System',
      },
      targetType: 'review',
      targetId: newReview.id,
      targetTitle: newReview.title,
      summary: `Analyzed draft; generated ${findings.length} evidence-backed findings (${contradictedCount} Contradicted, ${needsVerificationCount} Needs Verification, ${verifiedCount} Verified).`,
    })

    this.persist()
    return newReview
  }

  async applySuggestion(
    reviewId: string,
    findingId: string,
    customText?: string
  ): Promise<ReviewDraft> {
    const review = this.reviews.find((r) => r.id === reviewId)
    if (!review) throw new Error('Review not found')

    const finding = review.findings.find((f) => f.id === findingId)
    if (!finding) throw new Error('Finding not found')

    const replacement = customText || finding.suggestedCorrection
    if (!replacement) throw new Error('No suggested correction available')

    // Replace the exact claimText in currentText
    if (review.currentText.includes(finding.claimText)) {
      review.currentText = review.currentText.replace(finding.claimText, replacement)
    } else {
      // Fallback: substring replacement by indexes if text shifted
      review.currentText =
        review.currentText.slice(0, finding.startIndex) +
        replacement +
        review.currentText.slice(finding.endIndex)
    }

    finding.suggestionStatus = customText ? 'edited' : 'applied'
    if (customText) {
      finding.editedCorrection = customText
    }
    // Once corrected, the contradiction is resolved to verified
    finding.status = 'verified'
    finding.explanation = `Correction applied by ${this.currentUser.name}: "${replacement}". Claim is now compliant.`

    // Recalculate stats
    review.stats.verified = review.findings.filter((f) => f.status === 'verified').length
    review.stats.contradicted = review.findings.filter((f) => f.status === 'contradicted').length
    review.stats.needsVerification = review.findings.filter((f) => f.status === 'needs_verification').length
    review.stats.highSeverityCount = review.findings.filter(
      (f) => f.severity === 'high' && f.status === 'contradicted'
    ).length
    review.updatedAt = new Date().toISOString()

    // Audit log
    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: customText ? 'suggestion_edited' : 'suggestion_accepted',
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'finding',
      targetId: finding.id,
      targetTitle: review.title,
      summary: `Applied suggested correction for claim "${finding.claimText.slice(0, 40)}..." -> "${replacement.slice(0, 40)}...".`,
    })

    this.persist()
    return { ...review }
  }

  async rejectSuggestion(reviewId: string, findingId: string): Promise<ReviewDraft> {
    const review = this.reviews.find((r) => r.id === reviewId)
    if (!review) throw new Error('Review not found')

    const finding = review.findings.find((f) => f.id === findingId)
    if (!finding) throw new Error('Finding not found')

    finding.suggestionStatus = 'rejected'

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'suggestion_rejected',
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'finding',
      targetId: finding.id,
      targetTitle: review.title,
      summary: `Declined suggested correction for claim "${finding.claimText.slice(0, 40)}...".`,
    })

    this.persist()
    return { ...review }
  }

  async updateReviewDraftText(reviewId: string, newText: string): Promise<ReviewDraft> {
    const review = this.reviews.find((r) => r.id === reviewId)
    if (!review) throw new Error('Review not found')

    review.currentText = newText
    review.updatedAt = new Date().toISOString()

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'suggestion_edited',
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'review',
      targetId: review.id,
      targetTitle: review.title,
      summary: `Directly edited revised draft content.`,
    })

    this.persist()
    return { ...review }
  }

  async submitApprovalDecision(
    reviewId: string,
    decision: 'approved' | 'changes_requested' | 'rejected',
    comments: string
  ): Promise<ReviewDraft> {
    const review = this.reviews.find((r) => r.id === reviewId)
    if (!review) throw new Error('Review not found')

    const approvalDecision: ApprovalDecision = {
      decision,
      reviewerId: this.currentUser.id,
      reviewerName: this.currentUser.name,
      reviewerRole: this.currentUser.role,
      comments,
      timestamp: new Date().toISOString(),
    }

    review.approvalDecision = approvalDecision
    review.status = decision
    review.updatedAt = new Date().toISOString()

    const actionTypeMap = {
      approved: 'approval_decision' as const,
      changes_requested: 'revisions_requested' as const,
      rejected: 'rejection_decision' as const,
    }

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: actionTypeMap[decision],
      actor: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
      },
      targetType: 'review',
      targetId: review.id,
      targetTitle: review.title,
      summary: `Human review decision: ${decision.toUpperCase()}. Comment: "${comments}"`,
      metadata: {
        decision,
        comments,
      },
    })

    this.persist()
    return { ...review }
  }

  // Audit Events
  async getAuditEvents(filter?: {
    actionType?: string
    userId?: string
    reviewId?: string
    search?: string
  }): Promise<AuditEvent[]> {
    let list = [...this.auditEvents]
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
  }

  // Analytics
  async getGovernanceAnalytics(timeframe = '30d'): Promise<GovernanceAnalytics> {
    return calculateGovernanceMetrics(this.reviews, timeframe)
  }

  resetAllData() {
    this.documents = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS))
    this.reviews = JSON.parse(JSON.stringify(INITIAL_REVIEWS))
    this.auditEvents = JSON.parse(JSON.stringify(INITIAL_AUDIT_EVENTS))
    this.currentUser = { ...DEFAULT_USERS[0] }
    this.currentWorkspace = { ...WORKSPACES[0] }
    this.persist()
  }
}

export const mockStorage = new MockStorageAdapter()
