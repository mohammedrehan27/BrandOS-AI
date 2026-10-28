import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import {
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  FileCheck2,
  BookOpen,
  Sparkles,
  Check,
  X,
  Edit3,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Eye,
  Columns,
  Layers,
  ChevronRight,
  Info,
  Clock,
  UserCheck,
} from 'lucide-react'
import { reviewService, documentService, authService } from '@/api/client'
import { ReviewDraft, Finding, BrandDocument, User } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge, FindingStatusBadge, SeverityBadge, ReviewStatusBadge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { Drawer } from '@/components/common/Drawer'
import { formatDate } from '@/lib/utils'

export const ReviewResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [review, setReview] = useState<ReviewDraft | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Coordinated panel selections
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'original' | 'split' | 'revised'>('revised')
  const [mobileActiveTab, setMobileActiveTab] = useState<'draft' | 'findings' | 'evidence'>('findings')

  // Edit suggestion modal
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null)
  const [customCorrectionText, setCustomCorrectionText] = useState('')

  // Approval decision modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false)
  const [pendingDecision, setPendingDecision] = useState<'approved' | 'changes_requested' | 'rejected'>('approved')
  const [reviewerComment, setReviewerComment] = useState('')

  // Source document preview modal
  const [sourceDocModal, setSourceDocModal] = useState<{
    docName: string
    pageNumber: number
    section: string
    passage: string
  } | null>(null)

  const loadReview = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [r, u] = await Promise.all([
        reviewService.getReviewById(id),
        authService.getCurrentUser(),
      ])
      setReview(r)
      setCurrentUser(u)
      if (r?.findings && r.findings.length > 0) {
        setSelectedFindingId(r.findings[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReview()
  }, [id])

  if (loading || !review) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-white rounded-2xl border border-[#E5E8E1]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[600px]">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E8E1]" />
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E8E1]" />
          <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E8E1]" />
        </div>
      </div>
    )
  }

  const selectedFinding =
    review.findings.find((f) => f.id === selectedFindingId) || review.findings[0]

  const hasHighSeverityContradiction = review.findings.some(
    (f) => f.severity === 'high' && f.status === 'contradicted'
  )

  // Handle Accept Suggestion
  const handleAcceptSuggestion = async (finding: Finding) => {
    if (!review) return
    const updated = await reviewService.applySuggestion(review.id, finding.id)
    setReview(updated)
  }

  // Handle Edit Suggestion
  const handleSaveCustomSuggestion = async () => {
    if (!review || !editingFinding) return
    const updated = await reviewService.applySuggestion(
      review.id,
      editingFinding.id,
      customCorrectionText
    )
    setReview(updated)
    setEditingFinding(null)
  }

  // Handle Reject Suggestion
  const handleRejectSuggestion = async (finding: Finding) => {
    if (!review) return
    const updated = await reviewService.rejectSuggestion(review.id, finding.id)
    setReview(updated)
  }

  // Handle Human Approval Decision
  const handleConfirmDecision = async () => {
    if (!review) return
    const updated = await reviewService.submitApprovalDecision(
      review.id,
      pendingDecision,
      reviewerComment
    )
    setReview(updated)
    setDecisionModalOpen(false)

    if (pendingDecision === 'approved') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#647C70', '#7774A8', '#EAF3EB', '#C6974F'],
      })
    }
  }

  // Render highlighted text in draft viewer
  const renderHighlightedText = (text: string, isOriginal: boolean) => {
    // If we're rendering, break down by finding locations
    return (
      <div className="text-xs sm:text-sm leading-relaxed text-[#29332E] whitespace-pre-wrap font-sans">
        {review.findings.map((finding) => {
          const isSelected = selectedFinding?.id === finding.id

          const statusColorMap = {
            verified: 'bg-[#EAF3EB] text-[#22543D] border-b-2 border-[#2D6A4F]',
            contradicted: 'bg-[#F9EAEA] text-[#9B2C2C] border-b-2 border-[#E53E3E]',
            needs_verification: 'bg-[#FAF1E1] text-[#8C5E1A] border-b-2 border-[#C6974F]',
          }

          return null // for mapping logic
        })}

        {/* Highlight claims by replacement matching */}
        {text}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back button and page breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/queue')}
          className="inline-flex items-center gap-1.5 text-xs text-[#57635D] hover:text-[#29332E] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Review Queue</span>
        </button>

        <div className="flex items-center gap-2">
          <ReviewStatusBadge status={review.status} size="sm" />
          <span className="text-xs text-[#7E8C84] font-mono">{review.id}</span>
        </div>
      </div>

      {/* TOP HEADER & HUMAN GOVERNANCE BAR */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-5 shadow-subtle space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
              <span className="capitalize">{review.contentType.replace('_', ' ')}</span>
              <span>•</span>
              <span>Campaign: {review.campaignName || 'General Brand'}</span>
              <span>•</span>
              <span>Submitted {formatDate(review.submittedAt)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
              {review.title}
            </h1>
          </div>

          {/* Review Stats summary pill */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-[#EFF3F0] border border-[#C2CEC7] text-xs">
              <span className="text-[#57635D]">Claims Checked:</span>{' '}
              <strong className="text-[#29332E]">{review.stats.totalClaims}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#EAF3EB] border border-[#C6E1CD] text-xs">
              <span className="text-[#22543D]">Verified:</span>{' '}
              <strong className="text-[#22543D]">{review.stats.verified}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#F9EAEA] border border-[#F3C7C7] text-xs">
              <span className="text-[#9B2C2C]">Contradicted:</span>{' '}
              <strong className="text-[#9B2C2C]">{review.stats.contradicted}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#FAF1E1] border border-[#F2DEC0] text-xs">
              <span className="text-[#8C5E1A]">Needs Verif:</span>{' '}
              <strong className="text-[#8C5E1A]">{review.stats.needsVerification}</strong>
            </div>
          </div>
        </div>

        {/* Warning Banner if Unresolved High Severity Exists */}
        {hasHighSeverityContradiction && (
          <div className="bg-[#F9EAEA] border border-[#F3C7C7] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#9B2C2C]">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Unresolved High-Severity Brand Conflict Detected:</span>{' '}
              This draft contains direct contradictions with approved clinical or regulatory guidelines. We recommend applying the AI suggested corrections or modifying the claims before human approval.
            </div>
          </div>
        )}

        {/* Human Approval Decision Bar */}
        <div className="pt-3 border-t border-[#E5E8E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F7F8F5]/60 p-3 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-[#57635D]">
            <UserCheck className="w-4 h-4 text-[#647C70] shrink-0" />
            <span>
              Reviewer: <strong className="text-[#29332E]">{currentUser?.name}</strong> ({currentUser?.role})
            </span>
            {review.approvalDecision && (
              <span className="text-[11px] bg-white border border-[#E5E8E1] px-2 py-0.5 rounded text-[#29332E]">
                Last Decision: <span className="capitalize font-semibold">{review.approvalDecision.decision.replace('_', ' ')}</span> on {formatDate(review.approvalDecision.timestamp)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setPendingDecision('rejected')
                setDecisionModalOpen(true)
              }}
              icon={<ThumbsDown className="w-3.5 h-3.5" />}
            >
              Reject Draft
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPendingDecision('changes_requested')
                setDecisionModalOpen(true)
              }}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Request Revisions
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setPendingDecision('approved')
                setDecisionModalOpen(true)
              }}
              icon={<ThumbsUp className="w-3.5 h-3.5" />}
            >
              Approve Content
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Screen Tab Selector */}
      <div className="flex lg:hidden border-b border-[#E5E8E1] bg-white rounded-xl p-1 gap-1 text-xs">
        <button
          onClick={() => setMobileActiveTab('draft')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            mobileActiveTab === 'draft' ? 'bg-[#EFF3F0] text-[#29332E] font-semibold' : 'text-[#57635D]'
          }`}
        >
          Draft Copy
        </button>
        <button
          onClick={() => setMobileActiveTab('findings')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            mobileActiveTab === 'findings' ? 'bg-[#EFF3F0] text-[#29332E] font-semibold' : 'text-[#57635D]'
          }`}
        >
          Findings ({review.findings.length})
        </button>
        <button
          onClick={() => setMobileActiveTab('evidence')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            mobileActiveTab === 'evidence' ? 'bg-[#EFF3F0] text-[#29332E] font-semibold' : 'text-[#57635D]'
          }`}
        >
          Source Evidence
        </button>
      </div>

      {/* THREE-PANEL COORDINATED DESKTOP WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ======================================================== */}
        {/* LEFT PANEL: SUBMITTED DRAFT (4 COLS)                      */}
        {/* ======================================================== */}
        <div
          className={`lg:col-span-4 space-y-3 ${
            mobileActiveTab !== 'draft' ? 'hidden lg:block' : 'block'
          }`}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E1]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#647C70]" />
                <span className="text-xs font-semibold text-[#29332E]">Submitted Draft</span>
              </div>

              {/* View toggles: Original vs Revised vs Split */}
              <div className="flex items-center bg-[#F7F8F5] p-0.5 rounded-lg border border-[#E5E8E1] text-[11px]">
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    viewMode === 'original'
                      ? 'bg-white text-[#29332E] shadow-xs'
                      : 'text-[#57635D] hover:text-[#29332E]'
                  }`}
                  title="View unmodified submission"
                >
                  Original
                </button>
                <button
                  onClick={() => setViewMode('revised')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    viewMode === 'revised'
                      ? 'bg-white text-[#29332E] shadow-xs'
                      : 'text-[#57635D] hover:text-[#29332E]'
                  }`}
                  title="View draft with accepted corrections"
                >
                  Revised
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    viewMode === 'split'
                      ? 'bg-white text-[#29332E] shadow-xs'
                      : 'text-[#57635D] hover:text-[#29332E]'
                  }`}
                  title="View comparison diff"
                >
                  Diff
                </button>
              </div>
            </div>

            {/* Draft Content Display */}
            <div className="mt-3 space-y-3">
              {viewMode === 'split' ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#F9EAEA]/40 border border-[#F3C7C7]/60 text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#9B2C2C] block mb-1">
                      Original Submission
                    </span>
                    <p className="text-[#29332E] leading-relaxed whitespace-pre-wrap">
                      {review.originalText}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#EAF3EB]/40 border border-[#C6E1CD]/60 text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#22543D] block mb-1">
                      Revised Draft (With Applied Corrections)
                    </span>
                    <p className="text-[#29332E] leading-relaxed whitespace-pre-wrap">
                      {review.currentText}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] min-h-[300px]">
                  <div className="flex items-center justify-between text-[10px] text-[#7E8C84] mb-2 uppercase font-semibold">
                    <span>
                      {viewMode === 'original' ? 'Original Copy' : 'Current Working Draft'}
                    </span>
                    <span>Click finding in center to highlight</span>
                  </div>

                  <div className="text-xs sm:text-sm leading-relaxed text-[#29332E] whitespace-pre-wrap font-sans">
                    {viewMode === 'original' ? review.originalText : review.currentText}
                  </div>
                </div>
              )}

              {/* Interactive finding highlights list */}
              <div className="pt-2 border-t border-[#E5E8E1] space-y-1.5">
                <span className="text-[10px] font-semibold text-[#7E8C84] uppercase tracking-wider block">
                  Click Claim to Focus Evidence:
                </span>
                {review.findings.map((f) => {
                  const isSelected = selectedFinding?.id === f.id
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedFindingId(f.id)
                        setMobileActiveTab('findings')
                      }}
                      className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2 ${
                        isSelected
                          ? 'border-[#647C70] bg-[#EFF3F0] font-medium'
                          : 'border-[#E5E8E1] bg-white hover:border-[#D2D7CC]'
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">
                        {f.status === 'verified' && <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />}
                        {f.status === 'contradicted' && <AlertOctagon className="w-3.5 h-3.5 text-[#9B2C2C]" />}
                        {f.status === 'needs_verification' && <HelpCircle className="w-3.5 h-3.5 text-[#C6974F]" />}
                      </span>
                      <span className="truncate text-[#29332E] text-[11px] leading-snug">
                        "{f.claimText}"
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* ======================================================== */}
        {/* CENTER PANEL: FINDINGS (5 COLS)                           */}
        {/* ======================================================== */}
        <div
          className={`lg:col-span-5 space-y-3 ${
            mobileActiveTab !== 'findings' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-[#29332E] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7774A8]" />
              Evidence-Backed Findings ({review.findings.length})
            </span>
            <span className="text-[11px] text-[#7E8C84]">Click card to inspect source proof</span>
          </div>

          <div className="space-y-3">
            {review.findings.map((finding) => {
              const isSelected = selectedFinding?.id === finding.id

              return (
                <div
                  key={finding.id}
                  onClick={() => setSelectedFindingId(finding.id)}
                  className={`bg-white rounded-2xl border p-4.5 shadow-subtle transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'border-[#647C70] ring-1 ring-[#647C70]/30 shadow-card'
                      : 'border-[#E5E8E1] hover:border-[#D2D7CC]'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FindingStatusBadge status={finding.status} size="sm" />
                      <SeverityBadge severity={finding.severity} size="sm" />
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#57635D] font-medium bg-[#F7F8F5] px-2 py-0.5 rounded-full border border-[#E5E8E1]">
                      <span>Confidence:</span>
                      <strong className="text-[#29332E]">{finding.confidenceScore}%</strong>
                    </div>
                  </div>

                  {/* Claim Text */}
                  <div>
                    <span className="text-[10px] text-[#7E8C84] uppercase font-semibold block mb-0.5">
                      Claim Extracted from Draft:
                    </span>
                    <div className="p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] text-xs font-medium text-[#29332E] leading-relaxed">
                      "{finding.claimText}"
                    </div>
                  </div>

                  {/* Brand Rule & Explanation */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#647C70]">
                      {finding.brandRuleId}: {finding.brandRuleTitle}
                    </span>
                    <p className="text-xs text-[#57635D] leading-relaxed">
                      {finding.explanation}
                    </p>
                  </div>

                  {/* Suggested Correction Box */}
                  {finding.suggestedCorrection && (
                    <div className="p-3 rounded-xl bg-[#EFF3F0]/60 border border-[#C2CEC7] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#2D6A4F] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#647C70]" />
                          Suggested Compliant Correction
                        </span>
                        {finding.suggestionStatus === 'applied' && (
                          <span className="text-[10px] bg-[#EAF3EB] text-[#22543D] px-1.5 py-0.2 rounded font-semibold border border-[#C6E1CD]">
                            Applied to Draft
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-medium text-[#29332E] leading-relaxed">
                        "{finding.editedCorrection || finding.suggestedCorrection}"
                      </div>

                      {/* Suggestion Actions */}
                      <div className="flex items-center gap-2 pt-1 border-t border-[#C2CEC7]/60">
                        <Button
                          variant="success"
                          size="sm"
                          disabled={finding.suggestionStatus === 'applied'}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcceptSuggestion(finding)
                          }}
                          icon={<Check className="w-3 h-3" />}
                        >
                          {finding.suggestionStatus === 'applied' ? 'Applied' : 'Accept Correction'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingFinding(finding)
                            setCustomCorrectionText(
                              finding.editedCorrection || finding.suggestedCorrection || ''
                            )
                          }}
                          icon={<Edit3 className="w-3 h-3" />}
                        >
                          Edit
                        </Button>

                        {finding.suggestionStatus !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRejectSuggestion(finding)
                            }}
                          >
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: EVIDENCE & SOURCE TRACEABILITY (3 COLS)     */}
        {/* ======================================================== */}
        <div
          className={`lg:col-span-3 space-y-3 sticky top-18 ${
            mobileActiveTab !== 'evidence' ? 'hidden lg:block' : 'block'
          }`}
        >
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E1]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#647C70]" />
                <span className="text-xs font-semibold text-[#29332E]">
                  Ground-Truth Evidence
                </span>
              </div>
              <span className="text-[10px] text-[#7E8C84] font-mono">
                {selectedFinding?.evidence.citationId}
              </span>
            </div>

            {selectedFinding ? (
              <div className="space-y-3 text-xs">
                {/* Source Document Card */}
                <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] space-y-1.5">
                  <span className="text-[10px] text-[#7E8C84] uppercase font-semibold block">
                    Source Document & Version
                  </span>
                  <div className="font-semibold text-[#29332E] leading-snug">
                    {selectedFinding.evidence.documentName}
                  </div>
                  <div className="text-[11px] text-[#57635D] flex items-center justify-between">
                    <span>{selectedFinding.evidence.documentVersion}</span>
                    <span className="text-[#647C70] font-medium">
                      Page {selectedFinding.evidence.pageNumber}
                    </span>
                  </div>
                </div>

                {/* Section Heading */}
                <div className="space-y-1">
                  <span className="text-[10px] text-[#7E8C84] uppercase font-semibold block">
                    Section Heading
                  </span>
                  <div className="font-medium text-[#29332E]">
                    {selectedFinding.evidence.sectionHeading}
                  </div>
                </div>

                {/* Verbatim Source Passage (Strictly Isolated from AI text) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#647C70] tracking-wider">
                      Verbatim Retrieved Passage
                    </span>
                    <span className="text-[10px] text-[#7E8C84]">
                      Match: {selectedFinding.evidence.relevanceScore}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#EFF3F0]/60 border border-[#C2CEC7] font-mono text-[11px] text-[#29332E] leading-relaxed">
                    "{selectedFinding.evidence.verbatimPassage}"
                  </div>
                </div>

                {/* Open in PDF page preview button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() =>
                    setSourceDocModal({
                      docName: selectedFinding.evidence.documentName,
                      pageNumber: selectedFinding.evidence.pageNumber,
                      section: selectedFinding.evidence.sectionHeading,
                      passage: selectedFinding.evidence.verbatimPassage,
                    })
                  }
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  View in Document Viewer
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#7E8C84]">
                Select a finding card to view verbatim evidence citations.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* EDIT SUGGESTION MODAL */}
      <Modal
        isOpen={Boolean(editingFinding)}
        onClose={() => setEditingFinding(null)}
        title="Edit Suggested Correction"
        description="Tailor the suggested replacement text before applying it directly to the working draft."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-[#F9EAEA] border border-[#F3C7C7] text-xs">
            <span className="text-[10px] font-bold uppercase text-[#9B2C2C] block mb-1">
              Original Claim in Draft:
            </span>
            <span className="font-medium text-[#29332E]">
              "{editingFinding?.claimText}"
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#29332E] mb-1">
              Revised Correction Text
            </label>
            <textarea
              rows={4}
              value={customCorrectionText}
              onChange={(e) => setCustomCorrectionText(e.target.value)}
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl p-3 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70] focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E8E1]">
            <Button variant="outline" size="sm" onClick={() => setEditingFinding(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCustomSuggestion}>
              Apply Custom Text to Draft
            </Button>
          </div>
        </div>
      </Modal>

      {/* HUMAN APPROVAL DECISION MODAL */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={
          pendingDecision === 'approved'
            ? 'Sign Off & Approve Draft'
            : pendingDecision === 'changes_requested'
            ? 'Request Revisions from Creator'
            : 'Reject Draft Copy'
        }
        description="Every review decision requires explicit human sign-off and is logged permanently into the immutable audit trail."
        maxWidth="md"
      >
        <div className="space-y-4">
          {pendingDecision === 'approved' && hasHighSeverityContradiction && (
            <div className="bg-[#FAF1E1] p-3 rounded-xl border border-[#F2DEC0] text-xs text-[#8C5E1A]">
              <strong>Warning:</strong> You are approving a draft that still contains active high-severity contradictions. Your reviewer credentials will be permanently attached to this sign-off.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#29332E] mb-1">
              Reviewer Notes / Guidance Comments
            </label>
            <textarea
              rows={4}
              value={reviewerComment}
              onChange={(e) => setReviewerComment(e.target.value)}
              placeholder="e.g. Approved with botanical bio-actives correction applied. All regulatory disclaimers verified against COA-2024-B."
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl p-3 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70] focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E8E1]">
            <Button variant="outline" size="sm" onClick={() => setDecisionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={
                pendingDecision === 'approved'
                  ? 'primary'
                  : pendingDecision === 'rejected'
                  ? 'danger'
                  : 'secondary'
              }
              size="sm"
              onClick={handleConfirmDecision}
            >
              Submit Human Decision
            </Button>
          </div>
        </div>
      </Modal>

      {/* DOCUMENT VIEWER POPUP MODAL */}
      <Modal
        isOpen={Boolean(sourceDocModal)}
        onClose={() => setSourceDocModal(null)}
        title={`Ground Truth Source Viewer • Page ${sourceDocModal?.pageNumber}`}
        description={sourceDocModal?.docName}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="bg-white border-2 border-[#E5E8E1] rounded-xl p-6 shadow-subtle text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E8E1] text-[10px] text-[#7E8C84] uppercase font-mono">
              <span>Section: {sourceDocModal?.section}</span>
              <span>Page {sourceDocModal?.pageNumber}</span>
            </div>

            <p className="text-[#57635D] leading-relaxed">
              ...Corporate Policy Document Standards for commercial and digital marketing distribution. Authorized statements and evidentiary thresholds:...
            </p>

            <div className="p-3.5 rounded-xl bg-[#EFF3F0] border-2 border-[#647C70] text-[#29332E] font-mono text-[11px] leading-relaxed">
              <span className="text-[10px] uppercase font-bold text-[#2D6A4F] block mb-1">
                Verified Extracted Policy Rule:
              </span>
              "{sourceDocModal?.passage}"
            </div>

            <p className="text-[#57635D] text-[11px] leading-relaxed">
              Any marketing asset breaching this clause will fail automated audit scans and require legal signatory sign-off.
            </p>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setSourceDocModal(null)}>
              Close Document Viewer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
