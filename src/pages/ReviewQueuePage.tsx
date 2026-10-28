import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListTodo,
  Search,
  Filter,
  PlusCircle,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronRight,
  User,
} from 'lucide-react'
import { reviewService } from '@/api/client'
import { ReviewDraft, ReviewStatus } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { ReviewStatusBadge } from '@/components/common/Badge'
import { formatDate } from '@/lib/utils'

export const ReviewQueuePage: React.FC = () => {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<ReviewDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const loadReviews = async () => {
    try {
      setLoading(true)
      const list = await reviewService.getReviews({
        status: selectedStatus,
        contentType: selectedType,
        search: searchQuery,
      })
      setReviews(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [selectedStatus, selectedType, searchQuery])

  const statusTabs: { label: string; value: string; count?: number }[] = [
    { label: 'All Reviews', value: 'all' },
    { label: 'Ready for Review', value: 'ready_for_approval' },
    { label: 'Changes Requested', value: 'changes_requested' },
    { label: 'Approved', value: 'approved' },
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
            <ListTodo className="w-3.5 h-3.5" />
            Human-in-the-Loop Workflow
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
            Review Governance Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#57635D] mt-1 max-w-2xl">
            Track marketing copy through automated pre-flight checks, reviewer revision cycles, and final executive compliance approval.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/review/new')}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          New Content Review
        </Button>
      </div>

      {/* Filter and Tab Navigation */}
      <Card className="p-4 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-[#E5E8E1]">
          {statusTabs.map((tab) => {
            const isSelected = selectedStatus === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
                    : 'text-[#57635D] hover:bg-[#F7F8F5]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search & Format Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by review title, creator, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#29332E] placeholder-[#7E8C84] focus:outline-none focus:border-[#647C70]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#57635D] shrink-0">Format:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-2.5 py-1.5 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            >
              <option value="all">All Formats</option>
              <option value="landing_page">Landing Page</option>
              <option value="advertisement">Paid Ad</option>
              <option value="social_post">Social Post</option>
              <option value="email">Email</option>
              <option value="product_description">Product Description</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Review Queue Table */}
      <Card>
        {loading ? (
          <div className="space-y-3 py-6 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-[#F7F8F5] rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck2 className="w-10 h-10 text-[#7E8C84] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#29332E]">No Reviews in This Queue</h3>
            <p className="text-xs text-[#57635D] mt-1 max-w-sm mx-auto">
              There are no submissions currently matching this status filter. Submit a new draft to begin automated checks.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/review/new')}
              icon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              Submit Content Review
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8E1] text-[#7E8C84] font-medium uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-3">Review Identifier & Title</th>
                  <th className="pb-3 px-3">Content Format</th>
                  <th className="pb-3 px-3">Submitted By</th>
                  <th className="pb-3 px-3">Submission Date</th>
                  <th className="pb-3 px-3">Verified Findings</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E1]">
                {reviews.map((rev) => (
                  <tr
                    key={rev.id}
                    onClick={() => navigate(`/review/${rev.id}`)}
                    className="hover:bg-[#F7F8F5]/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-[#29332E] max-w-md truncate group-hover:text-[#647C70] transition-colors">
                        {rev.title}
                      </div>
                      <div className="text-[10px] font-mono text-[#7E8C84]">
                        {rev.id} • {rev.campaignName || 'Standard Campaign'}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-[#57635D] capitalize">
                      {rev.contentType.replace('_', ' ')}
                    </td>

                    <td className="py-3.5 px-3 text-[#57635D]">
                      <div className="flex items-center gap-2">
                        <img
                          src={rev.submittedBy.avatar || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'}
                          alt={rev.submittedBy.name}
                          className="w-5 h-5 rounded-full object-cover border border-[#E5E8E1]"
                        />
                        <span>{rev.submittedBy.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-[#7E8C84]">
                      {formatDate(rev.submittedAt)}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[#22543D] bg-[#EAF3EB] px-2 py-0.5 rounded-full border border-[#C6E1CD]">
                          {rev.stats.verified} Verified
                        </span>
                        {rev.stats.contradicted > 0 && (
                          <span className="text-[11px] font-medium text-[#9B2C2C] bg-[#F9EAEA] px-2 py-0.5 rounded-full border border-[#F3C7C7]">
                            {rev.stats.contradicted} Flagged
                          </span>
                        )}
                        {rev.stats.needsVerification > 0 && (
                          <span className="text-[11px] font-medium text-[#8C5E1A] bg-[#FAF1E1] px-2 py-0.5 rounded-full border border-[#F2DEC0]">
                            {rev.stats.needsVerification} Unverified
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <ReviewStatusBadge status={rev.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <Button variant="primary" size="sm">
                        Inspect Results
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
