import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  AlertOctagon,
  Clock,
  FileCheck2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Upload,
  Sparkles,
  CheckCircle2,
  FileText,
  Users,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { reviewService, documentService, analyticsService, authService } from '@/api/client'
import { ReviewDraft, BrandDocument, GovernanceAnalytics, Workspace } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { ReviewStatusBadge } from '@/components/common/Badge'
import { formatDate } from '@/lib/utils'

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<ReviewDraft[]>([])
  const [documents, setDocuments] = useState<BrandDocument[]>([])
  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [revs, docs, anls, ws] = await Promise.all([
          reviewService.getReviews(),
          documentService.getDocuments({ status: 'active' }),
          analyticsService.getAnalytics('30d'),
          authService.getCurrentWorkspace(),
        ])
        setReviews(revs)
        setDocuments(docs)
        setAnalytics(anls)
        setWorkspace(ws)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const pendingAttention = reviews.filter(
    (r) => r.status === 'ready_for_approval'
  )

  const recentActivity = reviews.slice(0, 5)

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white rounded-2xl border border-[#E5E8E1]" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-[#E5E8E1]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#647C70]" />
            Enterprise Governance Portal • {workspace?.name}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
            Brand Governance Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#57635D] mt-1 max-w-2xl">
            Every marketing claim is cross-referenced against {documents.length} approved company guideline documents with verbatim citations, automated conflict detection, and human approval sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/knowledge')}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Upload Guidelines
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/review/new')}
            icon={<FileCheck2 className="w-3.5 h-3.5" />}
          >
            Run Brand Review
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Reviews */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#57635D] mb-2">
            <span className="text-xs font-medium">Total Reviews</span>
            <FileText className="w-4 h-4 text-[#7774A8]" />
          </div>
          <div className="text-2xl font-bold text-[#29332E]">
            {analytics?.totalReviews || reviews.length}
          </div>
          <div className="text-[11px] text-[#647C70] font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +18% this month
          </div>
        </Card>

        {/* Verified Claims */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#57635D] mb-2">
            <span className="text-xs font-medium">Verified Claims</span>
            <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
          </div>
          <div className="text-2xl font-bold text-[#22543D]">
            {analytics?.verifiedClaims ?? 7}
          </div>
          <div className="text-[11px] text-[#57635D] mt-1">
            {analytics?.complianceRatePercent ?? 58}% compliance rate
          </div>
        </Card>

        {/* Flagged Findings */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#57635D] mb-2">
            <span className="text-xs font-medium">Flagged Findings</span>
            <AlertOctagon className="w-4 h-4 text-[#9B2C2C]" />
          </div>
          <div className="text-2xl font-bold text-[#9B2C2C]">
            {analytics?.flaggedFindings ?? 5}
          </div>
          <div className="text-[11px] text-[#9B2C2C] mt-1 font-medium">
            Requires human correction
          </div>
        </Card>

        {/* Pending Approvals */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#57635D] mb-2">
            <span className="text-xs font-medium">Pending Approvals</span>
            <Clock className="w-4 h-4 text-[#C6974F]" />
          </div>
          <div className="text-2xl font-bold text-[#8C5E1A]">
            {analytics?.pendingApprovals ?? pendingAttention.length}
          </div>
          <div className="text-[11px] text-[#8C5E1A] mt-1 font-medium">
            In review queue
          </div>
        </Card>

        {/* Avg Review Time */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#57635D] mb-2">
            <span className="text-xs font-medium">Avg Review Time</span>
            <TrendingUp className="w-4 h-4 text-[#647C70]" />
          </div>
          <div className="text-2xl font-bold text-[#29332E]">
            {analytics?.avgReviewTimeMinutes ?? 4.8}m
          </div>
          <div className="text-[11px] text-[#647C70] mt-1">
            vs 4.2h manual review
          </div>
        </Card>
      </div>

      {/* Charts & Pending Attention Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 14-Day Activity Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Review Activity & Compliance Trends</CardTitle>
              <CardDescription>
                Verified vs flagged claims over the last 30 days
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#57635D]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#647C70]" /> Verified
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C65D5D]" /> Contradicted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C6974F]" /> Needs Verif.
              </span>
            </div>
          </CardHeader>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.weeklyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#647C70" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#647C70" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorContradicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C65D5D" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C65D5D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#7E8C84" fontSize={11} tickLine={false} />
                <YAxis stroke="#7E8C84" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E8E1',
                    borderRadius: '10px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(41, 51, 46, 0.08)',
                  }}
                />
                <Area type="monotone" dataKey="verified" stroke="#647C70" strokeWidth={2} fillOpacity={1} fill="url(#colorVerified)" />
                <Area type="monotone" dataKey="contradicted" stroke="#C65D5D" strokeWidth={2} fillOpacity={1} fill="url(#colorContradicted)" />
                <Area type="monotone" dataKey="needsVerification" stroke="#C6974F" strokeWidth={2} fillOpacity={0} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Claim Distribution Donut Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Claim Distribution</CardTitle>
              <CardDescription>Breakdown by verification verdict</CardDescription>
            </div>
          </CardHeader>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.statusBreakdown || []}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(analytics?.statusBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E8E1',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2 pt-2 border-t border-[#E5E8E1]">
            {(analytics?.statusBreakdown || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#57635D]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-semibold text-[#29332E]">{item.value} claims</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Two Column Section: Pending Approvals & Brand Knowledge Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Reviews Requiring Attention */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Pending Reviews Requiring Human Decision</CardTitle>
              <CardDescription>
                AI pre-flight checks complete. Human reviewer approval required before publish.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/queue')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Queue
            </Button>
          </CardHeader>

          <div className="space-y-2.5">
            {pendingAttention.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#7E8C84]">
                All reviews cleared! No drafts currently waiting for human approval.
              </div>
            ) : (
              pendingAttention.map((rev) => (
                <div
                  key={rev.id}
                  onClick={() => navigate(`/review/${rev.id}`)}
                  className="p-3.5 rounded-xl border border-[#E5E8E1] hover:border-[#D2D7CC] hover:bg-[#F7F8F5]/60 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-[#7E8C84]">{rev.id}</span>
                      <ReviewStatusBadge status={rev.status} size="sm" />
                      {rev.stats.highSeverityCount > 0 && (
                        <span className="text-[10px] bg-[#F9EAEA] text-[#9B2C2C] px-1.5 py-0.2 rounded border border-[#F3C7C7] font-semibold flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {rev.stats.highSeverityCount} High Conflict
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-[#29332E] truncate group-hover:text-[#647C70] transition-colors">
                      {rev.title}
                    </h4>
                    <div className="text-[11px] text-[#57635D] mt-0.5">
                      Submitted by {rev.submittedBy.name} • {formatDate(rev.submittedAt)} • {rev.contentType.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[11px] text-[#57635D] hidden sm:block">
                      <div className="font-semibold text-[#29332E]">
                        {rev.stats.totalClaims} Claims Checked
                      </div>
                      <div>
                        {rev.stats.verified} Verified / {rev.stats.contradicted} Flagged
                      </div>
                    </div>
                    <Button variant="primary" size="sm">
                      Inspect Evidence
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Brand Knowledge Summary Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Brand Knowledge Base</CardTitle>
              <CardDescription>Active company source guidelines</CardDescription>
            </div>
            <BookOpen className="w-4 h-4 text-[#647C70]" />
          </CardHeader>

          <div className="space-y-3">
            <div className="bg-[#EFF3F0] p-3.5 rounded-xl border border-[#C2CEC7] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#57635D]">Indexed Guidelines</div>
                <div className="text-xl font-bold text-[#22543D]">{documents.length} Documents</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#57635D]">Active Rules</div>
                <div className="text-xl font-bold text-[#22543D]">
                  {documents.reduce((acc, d) => acc + d.extractedRulesCount, 0)} Rules
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#7E8C84] uppercase tracking-wider">
                Active Guideline Files
              </div>
              {documents.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate('/knowledge')}
                  className="p-2.5 rounded-xl border border-[#E5E8E1] hover:bg-[#F7F8F5] transition-colors cursor-pointer text-xs"
                >
                  <div className="font-medium text-[#29332E] truncate">{doc.name}</div>
                  <div className="text-[10px] text-[#7E8C84] mt-0.5 flex items-center justify-between">
                    <span>{doc.category}</span>
                    <span>{doc.version} • {doc.pageCount} pages</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center mt-2"
              onClick={() => navigate('/knowledge')}
            >
              Manage Knowledge Base
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Review Submissions</CardTitle>
            <CardDescription>Latest marketing drafts submitted for governance check</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/queue')}
            iconRight={<ArrowRight className="w-3.5 h-3.5" />}
          >
            All Reviews
          </Button>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E8E1] text-[#7E8C84] font-medium uppercase text-[10px] tracking-wider">
                <th className="pb-2.5 px-3">Review ID & Title</th>
                <th className="pb-2.5 px-3">Type</th>
                <th className="pb-2.5 px-3">Submitted By</th>
                <th className="pb-2.5 px-3">Date</th>
                <th className="pb-2.5 px-3">Compliance Findings</th>
                <th className="pb-2.5 px-3">Status</th>
                <th className="pb-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E1]">
              {recentActivity.map((rev) => (
                <tr
                  key={rev.id}
                  className="hover:bg-[#F7F8F5]/60 transition-colors cursor-pointer"
                  onClick={() => navigate(`/review/${rev.id}`)}
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#29332E] max-w-xs truncate">{rev.title}</div>
                    <div className="text-[10px] font-mono text-[#7E8C84]">{rev.id}</div>
                  </td>
                  <td className="py-3 px-3 text-[#57635D] capitalize">
                    {rev.contentType.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-3 text-[#57635D]">
                    {rev.submittedBy.name}
                  </td>
                  <td className="py-3 px-3 text-[#7E8C84]">
                    {formatDate(rev.submittedAt)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-[#22543D] bg-[#EAF3EB] px-1.5 py-0.5 rounded border border-[#C6E1CD]">
                        {rev.stats.verified} Verified
                      </span>
                      {rev.stats.contradicted > 0 && (
                        <span className="text-[11px] font-medium text-[#9B2C2C] bg-[#F9EAEA] px-1.5 py-0.5 rounded border border-[#F3C7C7]">
                          {rev.stats.contradicted} Contradicted
                        </span>
                      )}
                      {rev.stats.needsVerification > 0 && (
                        <span className="text-[11px] font-medium text-[#8C5E1A] bg-[#FAF1E1] px-1.5 py-0.5 rounded border border-[#F2DEC0]">
                          {rev.stats.needsVerification} Needs Verif
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <ReviewStatusBadge status={rev.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button variant="ghost" size="sm">
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
