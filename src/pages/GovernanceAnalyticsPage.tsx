import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Filter,
  Calendar,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { analyticsService } from '@/api/client'
import { GovernanceAnalytics } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { SeverityBadge } from '@/components/common/Badge'

export const GovernanceAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<GovernanceAnalytics | null>(null)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await analyticsService.getAnalytics(timeframe)
        setAnalytics(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [timeframe])

  if (loading || !analytics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-white rounded-2xl border border-[#E5E8E1]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-80">
          <div className="bg-white rounded-2xl border border-[#E5E8E1]" />
          <div className="bg-white rounded-2xl border border-[#E5E8E1]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Compliance Telemetry & Rule Intelligence
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
            Governance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#57635D] mt-1 max-w-2xl">
            Quantitative metrics on repeated brand-rule violations, prohibited terminology patterns, reviewer velocity, and guideline coverage.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center bg-[#F7F8F5] p-1 rounded-xl border border-[#E5E8E1] text-xs self-start sm:self-auto">
          {(['7d', '30d', '90d', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                timeframe === t
                  ? 'bg-white text-[#29332E] shadow-xs font-semibold'
                  : 'text-[#57635D] hover:text-[#29332E]'
              }`}
            >
              {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : t === '90d' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect>
          <div className="text-xs text-[#57635D] font-medium">Compliance Rate</div>
          <div className="text-2xl font-bold text-[#22543D] mt-1">
            {analytics.complianceRatePercent}%
          </div>
          <div className="text-[11px] text-[#647C70] mt-0.5">
            Verified first-pass claims
          </div>
        </Card>

        <Card hoverEffect>
          <div className="text-xs text-[#57635D] font-medium">Avg Review Velocity</div>
          <div className="text-2xl font-bold text-[#29332E] mt-1">
            {analytics.avgReviewTimeMinutes}m
          </div>
          <div className="text-[11px] text-[#647C70] mt-0.5">
            Turnaround time per draft
          </div>
        </Card>

        <Card hoverEffect>
          <div className="text-xs text-[#57635D] font-medium">Repeated Contradictions</div>
          <div className="text-2xl font-bold text-[#9B2C2C] mt-1">
            {analytics.flaggedFindings}
          </div>
          <div className="text-[11px] text-[#9B2C2C] mt-0.5 font-medium">
            High & medium severity
          </div>
        </Card>

        <Card hoverEffect>
          <div className="text-xs text-[#57635D] font-medium">Verified Evidence Base</div>
          <div className="text-2xl font-bold text-[#7774A8] mt-1">
            {analytics.verifiedClaims}
          </div>
          <div className="text-[11px] text-[#57635D] mt-0.5">
            Cited ground-truth facts
          </div>
        </Card>
      </div>

      {/* Charts Grid: Categories & Severities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Findings by Guideline Category Stacked Bar */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Findings by Guideline Domain & Severity</CardTitle>
              <CardDescription>
                High, medium, and low conflicts across functional categories
              </CardDescription>
            </div>
          </CardHeader>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.categoryBreakdown}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="category" stroke="#7E8C84" fontSize={10} tickLine={false} />
                <YAxis stroke="#7E8C84" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E8E1',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="high" name="High Severity" fill="#C65D5D" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="medium" name="Medium Severity" fill="#C6974F" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="low" name="Low Severity" fill="#647C70" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Reviewer Decisions Distribution */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Human Reviewer Decision Distribution</CardTitle>
              <CardDescription>
                Outcomes of human compliance review workflows
              </CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-4">
            {analytics.reviewerDecisions.map((dec, idx) => (
              <div key={idx} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#29332E]">{dec.decision}</span>
                  <span className="text-[#57635D]">
                    {dec.count} reviews ({dec.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-[#E5E8E1] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${dec.percentage}%`,
                      backgroundColor:
                        idx === 0
                          ? '#647C70'
                          : idx === 1
                          ? '#7774A8'
                          : idx === 2
                          ? '#C6974F'
                          : '#C65D5D',
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="bg-[#EFF3F0] p-3 rounded-xl border border-[#C2CEC7] text-xs text-[#22543D] mt-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
              <span>
                <strong>87% of drafts</strong> were approved either on first-pass or immediately after applying BrandOS AI suggested corrections.
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Table Section: Recurring Violations & Prohibited Terminology */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Repeated Brand Rule Violations */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top Recurring Brand-Rule Violations</CardTitle>
              <CardDescription>
                Frequently triggered policy conflicts across marketing channels
              </CardDescription>
            </div>
            <AlertTriangle className="w-4 h-4 text-[#C6974F]" />
          </CardHeader>

          <div className="space-y-2.5">
            {analytics.recurringViolations.map((v, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-[#E5E8E1] bg-white hover:border-[#D2D7CC] transition-colors flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold text-[#29332E] truncate">{v.rule}</div>
                  <div className="text-[11px] text-[#7E8C84] mt-0.5">{v.category}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <SeverityBadge severity={v.severity} size="sm" />
                  <span className="text-xs font-bold text-[#29332E] bg-[#F7F8F5] px-2 py-0.5 rounded border border-[#E5E8E1]">
                    {v.count}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Flagged Problematic Terminology Tag Cloud / Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Frequently Flagged Terminology</CardTitle>
              <CardDescription>
                Prohibited words and approved compliant alternatives
              </CardDescription>
            </div>
            <Lightbulb className="w-4 h-4 text-[#7774A8]" />
          </CardHeader>

          <div className="space-y-2.5">
            {analytics.flaggedTerminology.map((term, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-[#E5E8E1] bg-white text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#9B2C2C] bg-[#F9EAEA] px-2 py-0.5 rounded border border-[#F3C7C7]">
                    "{term.term}"
                  </span>
                  <span className="text-[10px] text-[#7E8C84]">Flagged {term.count} times</span>
                </div>
                <div className="text-[11px] text-[#57635D] flex items-center gap-1.5 pt-0.5">
                  <span className="text-[#647C70] font-semibold">Recommended:</span>
                  <span className="text-[#29332E] italic">"{term.suggestedAlternative}"</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
