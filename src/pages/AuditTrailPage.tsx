import React, { useState, useEffect } from 'react'
import {
  History,
  Search,
  Filter,
  Download,
  Shield,
  FileCheck2,
  CheckCircle2,
  AlertOctagon,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  User,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { auditService, authService } from '@/api/client'
import { AuditEvent, AuditEventType, User as UserType } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { formatDateTime, formatDate } from '@/lib/utils'

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [auditList, userList] = await Promise.all([
          auditService.getAuditEvents({
            actionType: selectedAction,
            userId: selectedUser,
            search: searchQuery,
          }),
          authService.getAllUsers(),
        ])
        setEvents(auditList)
        setUsers(userList)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedAction, selectedUser, searchQuery])

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `brandos_audit_trail_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const renderEventIcon = (type: AuditEventType) => {
    switch (type) {
      case 'approval_decision':
        return <ThumbsUp className="w-4 h-4 text-[#2D6A4F]" />
      case 'rejection_decision':
        return <ThumbsDown className="w-4 h-4 text-[#9B2C2C]" />
      case 'revisions_requested':
        return <MessageSquare className="w-4 h-4 text-[#C6974F]" />
      case 'suggestion_accepted':
      case 'suggestion_edited':
        return <CheckCircle2 className="w-4 h-4 text-[#647C70]" />
      case 'finding_generated':
        return <Sparkles className="w-4 h-4 text-[#7774A8]" />
      case 'document_indexed':
      case 'document_uploaded':
        return <BookOpen className="w-4 h-4 text-[#647C70]" />
      case 'draft_submitted':
      default:
        return <FileCheck2 className="w-4 h-4 text-[#57635D]" />
    }
  }

  const getEventBadge = (type: AuditEventType) => {
    const label = type.replace(/_/g, ' ').toUpperCase()
    switch (type) {
      case 'approval_decision':
        return <span className="text-[10px] bg-[#EAF3EB] text-[#22543D] px-2 py-0.5 rounded-full border border-[#C6E1CD] font-semibold">{label}</span>
      case 'rejection_decision':
        return <span className="text-[10px] bg-[#F9EAEA] text-[#9B2C2C] px-2 py-0.5 rounded-full border border-[#F3C7C7] font-semibold">{label}</span>
      case 'revisions_requested':
        return <span className="text-[10px] bg-[#FAF1E1] text-[#8C5E1A] px-2 py-0.5 rounded-full border border-[#F2DEC0] font-semibold">{label}</span>
      case 'finding_generated':
        return <span className="text-[10px] bg-[#F1F0FA] text-[#4B487A] px-2 py-0.5 rounded-full border border-[#D8D6EF] font-semibold">{label}</span>
      default:
        return <span className="text-[10px] bg-[#EFF1EC] text-[#57635D] px-2 py-0.5 rounded-full border border-[#E5E8E1] font-semibold">{label}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
            <History className="w-3.5 h-3.5" />
            Immutable Verification Ledger
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
            Governance Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-[#57635D] mt-1 max-w-2xl">
            Complete chronological record of all guideline indexing, algorithmic finding generations, human reviewer decisions, and correction events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJson}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Export Audit Ledger (JSON)
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by actor, summary, target title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#29332E] placeholder-[#7E8C84] focus:outline-none focus:border-[#647C70]"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#57635D] shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Action:</span>
            </div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-2.5 py-1.5 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            >
              <option value="all">All Action Types</option>
              <option value="approval_decision">Approvals</option>
              <option value="revisions_requested">Revisions Requested</option>
              <option value="rejection_decision">Rejections</option>
              <option value="suggestion_accepted">Suggestions Accepted</option>
              <option value="finding_generated">AI Findings</option>
              <option value="draft_submitted">Draft Submissions</option>
              <option value="document_indexed">Document Indexing</option>
            </select>

            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-2.5 py-1.5 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            >
              <option value="all">All Actors</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Feed Table */}
      <Card>
        {loading ? (
          <div className="space-y-3 py-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-[#F7F8F5] rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#7E8C84]">
            No audit records found matching your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-xl border border-[#E5E8E1] bg-white hover:border-[#D2D7CC] transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] shrink-0 mt-0.5">
                    {renderEventIcon(event.actionType)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getEventBadge(event.actionType)}
                      <span className="font-semibold text-[#29332E]">{event.targetTitle}</span>
                      <span className="text-[10px] font-mono text-[#7E8C84] bg-[#F7F8F5] px-1.5 py-0.2 rounded border border-[#E5E8E1]">
                        {event.targetId}
                      </span>
                    </div>

                    <p className="text-[#57635D] leading-relaxed">
                      {event.summary}
                    </p>

                    <div className="text-[11px] text-[#7E8C84] flex items-center gap-2 pt-0.5">
                      <span>Actor: <strong className="text-[#29332E] font-medium">{event.actor.name}</strong> ({event.actor.role})</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 text-[11px] text-[#7E8C84] flex sm:flex-col items-center sm:items-end justify-between sm:justify-start">
                  <span className="font-mono text-[#29332E]">{formatDateTime(event.timestamp)}</span>
                  <span className="text-[10px] text-[#7E8C84] font-mono mt-0.5">{event.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
