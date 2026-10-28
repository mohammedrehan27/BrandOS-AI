import React, { useState, useEffect } from 'react'
import {
  Settings,
  Building2,
  Users,
  Bell,
  Sliders,
  Server,
  Shield,
  Check,
  UserCheck,
  Copy,
  ExternalLink,
  Plus,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { authService, getApiConfigStatus } from '@/api/client'
import { User, Workspace, UserRole } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { useTheme, Theme } from '@/lib/theme'

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState<'workspace' | 'team' | 'rules' | 'api'>('workspace')

  // Form states
  const [workspaceName, setWorkspaceName] = useState('')
  const [industry, setIndustry] = useState('')
  const [sensitivity, setSensitivity] = useState<'strict' | 'standard' | 'lenient'>('strict')
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)

  // Notification toggles
  const [notifyHighSeverity, setNotifyHighSeverity] = useState(true)
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true)
  const [notifyApprovalRequired, setNotifyApprovalRequired] = useState(true)

  // Saved feedback
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Invite member modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('Reviewer')

  const apiStatus = getApiConfigStatus()

  useEffect(() => {
    const load = async () => {
      const [u, ws, uList] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentWorkspace(),
        authService.getAllUsers(),
      ])
      setCurrentUser(u)
      setWorkspace(ws)
      setAllUsers(uList)
      if (ws) {
        setWorkspaceName(ws.name)
        setIndustry(ws.industry)
      }
    }
    load()
  }, [])

  const handleSaveWorkspace = () => {
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2000)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(id)
    setTimeout(() => setCopiedEndpoint(null), 1500)
  }

  const handleInvite = () => {
    if (!inviteEmail || !inviteName) return
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      role: inviteRole,
      workspaceId: workspace?.id || 'ws-1',
    }
    setAllUsers([...allUsers, newUser])
    setInviteModalOpen(false)
    setInviteName('')
    setInviteEmail('')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
            <Settings className="w-3.5 h-3.5" />
            Administration & Enterprise Configuration
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
            Settings & Governance Rules
          </h1>
          <p className="text-xs sm:text-sm text-[#57635D] mt-1 max-w-2xl">
            Configure company branding, reviewer roles, automated policy sensitivity, and connect to the Node.js Express REST API backend.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E8E1] bg-white rounded-xl p-1 text-xs">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'workspace'
              ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
              : 'text-[#57635D] hover:bg-[#F7F8F5]'
          }`}
        >
          Workspace & Profile
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'team'
              ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
              : 'text-[#57635D] hover:bg-[#F7F8F5]'
          }`}
        >
          Team & Role Permissions ({allUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
              : 'text-[#57635D] hover:bg-[#F7F8F5]'
          }`}
        >
          Governance Thresholds & Alerts
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'api'
              ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
              : 'text-[#57635D] hover:bg-[#F7F8F5]'
          }`}
        >
          Backend API Integration
        </button>
      </div>

      {/* TAB 1: WORKSPACE & PROFILE */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Workspace Profile & Commercial Identity</CardTitle>
                <CardDescription>
                  Details used across corporate guidelines and compliance certificates
                </CardDescription>
              </div>
            </CardHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#29332E] mb-1">
                    Workspace / Legal Entity Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29332E] mb-1">
                    Industry Sector & Regulatory Scope
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-[#57635D]">
                  Plan: <strong className="text-[#29332E]">Enterprise Multi-Brand License</strong>
                </div>
                <Button variant="primary" size="sm" onClick={handleSaveWorkspace}>
                  {savedSuccess ? 'Saved Changes!' : 'Save Workspace'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Appearance & Display Theme */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Appearance & Display Theme</CardTitle>
                <CardDescription>
                  Switch between light and dark themes or synchronize with your operating system preference
                </CardDescription>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Light Option */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  theme === 'light'
                    ? 'border-[#647C70] bg-[#EFF3F0] ring-1 ring-[#647C70]'
                    : 'border-[#E5E8E1] bg-white hover:bg-[#F7F8F5]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#FAF1E1] border border-[#F2DEC0]">
                    <Sun className="w-4 h-4 text-[#8C5E1A]" />
                  </div>
                  {theme === 'light' && (
                    <span className="w-2 h-2 rounded-full bg-[#647C70]" />
                  )}
                </div>
                <div className="text-xs font-semibold text-[#29332E]">Light Theme</div>
                <div className="text-[11px] text-[#57635D] mt-0.5">
                  Classic corporate ivory & sage
                </div>
              </button>

              {/* Dark Option */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  theme === 'dark'
                    ? 'border-[#647C70] bg-[#EFF3F0] ring-1 ring-[#647C70]'
                    : 'border-[#E5E8E1] bg-white hover:bg-[#F7F8F5]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#1A182E] border border-[#D8D6EF]/30">
                    <Moon className="w-4 h-4 text-[#A5B4FC]" />
                  </div>
                  {theme === 'dark' && (
                    <span className="w-2 h-2 rounded-full bg-[#647C70]" />
                  )}
                </div>
                <div className="text-xs font-semibold text-[#29332E]">Dark Theme</div>
                <div className="text-[11px] text-[#57635D] mt-0.5">
                  Deep obsidian & high-contrast emerald
                </div>
              </button>

              {/* System Option */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  theme === 'system'
                    ? 'border-[#647C70] bg-[#EFF3F0] ring-1 ring-[#647C70]'
                    : 'border-[#E5E8E1] bg-white hover:bg-[#F7F8F5]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#F1F0FA] border border-[#D8D6EF]">
                    <Monitor className="w-4 h-4 text-[#4B487A]" />
                  </div>
                  {theme === 'system' && (
                    <span className="w-2 h-2 rounded-full bg-[#647C70]" />
                  )}
                </div>
                <div className="text-xs font-semibold text-[#29332E]">System Sync</div>
                <div className="text-[11px] text-[#57635D] mt-0.5">
                  Matches OS preference ({resolvedTheme})
                </div>
              </button>
            </div>
          </Card>

          {/* Current User Persona Switcher */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Active Demo Persona & Role</CardTitle>
                <CardDescription>
                  Simulate different access permissions during your hackathon walkthrough
                </CardDescription>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allUsers.map((u) => {
                const isActive = currentUser?.id === u.id
                return (
                  <div
                    key={u.id}
                    onClick={() => authService.switchUser(u.id).then(setCurrentUser)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      isActive
                        ? 'border-[#647C70] bg-[#EFF3F0]'
                        : 'border-[#E5E8E1] bg-white hover:border-[#D2D7CC]'
                    }`}
                  >
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover border border-[#E5E8E1]"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#29332E] truncate">{u.name}</div>
                      <div className="text-[10px] text-[#647C70] font-medium">{u.role}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: TEAM & ROLE PERMISSIONS */}
      {activeTab === 'team' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Team Members & Governance Access Roles</CardTitle>
              <CardDescription>
                Assign Brand Manager, Reviewer, or Creator roles across company drafts
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Invite Member
            </Button>
          </CardHeader>

          <div className="space-y-3">
            {allUsers.map((user) => (
              <div
                key={user.id}
                className="p-3.5 rounded-xl border border-[#E5E8E1] bg-white flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#E5E8E1]"
                  />
                  <div>
                    <div className="font-semibold text-[#29332E]">{user.name}</div>
                    <div className="text-[11px] text-[#7E8C84]">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      user.role === 'Brand Manager'
                        ? 'bg-[#EFF3F0] text-[#22543D] border border-[#C2CEC7]'
                        : user.role === 'Reviewer'
                        ? 'bg-[#F1F0FA] text-[#4B487A] border border-[#D8D6EF]'
                        : 'bg-[#FAF1E1] text-[#8C5E1A] border border-[#F2DEC0]'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] text-xs text-[#57635D] mt-4 space-y-1">
            <div className="font-semibold text-[#29332E]">Role Capabilities:</div>
            <div>• <strong className="text-[#29332E]">Brand Manager:</strong> Full guideline upload, deletion, policy sensitivity calibration, and administrative authority.</div>
            <div>• <strong className="text-[#29332E]">Reviewer:</strong> Legal and clinical review authority, decision sign-off (Approve / Reject / Request Revisions).</div>
            <div>• <strong className="text-[#29332E]">Creator:</strong> Content submission, pre-flight review execution, and correction editing.</div>
          </div>
        </Card>
      )}

      {/* TAB 3: THRESHOLDS & ALERTS */}
      {activeTab === 'rules' && (
        <Card className="space-y-6">
          <CardHeader>
            <div>
              <CardTitle>AI Policy Strictness & Confidence Thresholds</CardTitle>
              <CardDescription>
                Calibrate sensitivity for contradictory health and sustainability statements
              </CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-2">
                Automated Checking Sensitivity Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setSensitivity('strict')}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    sensitivity === 'strict'
                      ? 'border-[#647C70] bg-[#EFF3F0]'
                      : 'border-[#E5E8E1] bg-white'
                  }`}
                >
                  <div className="font-semibold text-[#29332E]">Strict (Pharmaceutical & FDA)</div>
                  <div className="text-[11px] text-[#57635D] mt-1">
                    Flags any unqualified efficacy assertion, missing trial citation, or unverified zero-carbon declaration.
                  </div>
                </div>

                <div
                  onClick={() => setSensitivity('standard')}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    sensitivity === 'standard'
                      ? 'border-[#647C70] bg-[#EFF3F0]'
                      : 'border-[#E5E8E1] bg-white'
                  }`}
                >
                  <div className="font-semibold text-[#29332E]">Standard (Commercial SaaS)</div>
                  <div className="text-[11px] text-[#57635D] mt-1">
                    Flags explicit contradictions and high-severity claims with confidence score ≥ 85%.
                  </div>
                </div>

                <div
                  onClick={() => setSensitivity('lenient')}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    sensitivity === 'lenient'
                      ? 'border-[#647C70] bg-[#EFF3F0]'
                      : 'border-[#E5E8E1] bg-white'
                  }`}
                >
                  <div className="font-semibold text-[#29332E]">Permissive (Exploratory)</div>
                  <div className="text-[11px] text-[#57635D] mt-1">
                    Only flags critical statutory legal violations; provides gentle tone suggestions.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E8E1] space-y-3">
              <div className="text-xs font-semibold text-[#29332E]">
                Automated Review Notification Preferences
              </div>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E5E8E1] bg-white cursor-pointer hover:bg-[#F7F8F5]">
                  <input
                    type="checkbox"
                    checked={notifyHighSeverity}
                    onChange={(e) => setNotifyHighSeverity(e.target.checked)}
                    className="rounded text-[#647C70]"
                  />
                  <div>
                    <div className="font-medium text-[#29332E]">High-Severity Conflict Immediate Alert</div>
                    <div className="text-[11px] text-[#7E8C84]">Trigger urgent email/webhook when a draft contains 2+ high-severity contradictions.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E5E8E1] bg-white cursor-pointer hover:bg-[#F7F8F5]">
                  <input
                    type="checkbox"
                    checked={notifyApprovalRequired}
                    onChange={(e) => setNotifyApprovalRequired(e.target.checked)}
                    className="rounded text-[#647C70]"
                  />
                  <div>
                    <div className="font-medium text-[#29332E]">Human Approval Sign-Off Request</div>
                    <div className="text-[11px] text-[#7E8C84]">Notify assigned reviewer when an AI pre-flight check finishes processing.</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: API & BACKEND INTEGRATION */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Express.js REST API Client Status</CardTitle>
                <CardDescription>
                  Configuration connecting this frontend to your separate Node.js / Express backend
                </CardDescription>
              </div>
              <Server className="w-4 h-4 text-[#647C70]" />
            </CardHeader>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#29332E]">API Base Endpoint:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#E5E8E1] text-[#647C70]">
                    {apiStatus.baseUrl}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#29332E]">Adapter Status:</span>
                  <span className="bg-[#FAF1E1] text-[#8C5E1A] px-2 py-0.5 rounded font-semibold border border-[#F2DEC0]">
                    {apiStatus.isDemoMode ? 'Local Stateful Mock Adapter Active' : 'Connected to Express Server'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-sm text-[#29332E]">
                  How to Connect Real Express Backend:
                </div>
                <p className="text-[#57635D] leading-relaxed">
                  1. In the project root, create or update <code className="bg-[#EFF3F0] px-1 py-0.5 rounded text-[#29332E] font-mono">.env</code>:
                </p>
                <div className="p-3 rounded-xl bg-[#29332E] text-white font-mono text-[11px] flex items-center justify-between">
                  <span>VITE_API_BASE_URL=http://localhost:5000</span>
                  <button
                    onClick={() => handleCopy('VITE_API_BASE_URL=http://localhost:5000', 'env')}
                    className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
                  >
                    {copiedEndpoint === 'env' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[#57635D] leading-relaxed">
                  2. All endpoints in <code className="font-mono text-[#647C70]">src/api/client.ts</code> will automatically call your Express server.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-xs text-[#29332E] uppercase tracking-wider mb-2">
                  Expected Backend Route Specifications
                </h4>
                <div className="border border-[#E5E8E1] rounded-xl overflow-hidden divide-y divide-[#E5E8E1] text-[11px]">
                  <div className="p-2.5 bg-[#F7F8F5] flex items-center justify-between font-mono">
                    <span>GET /api/documents</span>
                    <span className="text-[#57635D] font-sans">Returns array of BrandDocument</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between font-mono">
                    <span>POST /api/documents/upload</span>
                    <span className="text-[#57635D] font-sans">Multipart file upload + PDF chunking</span>
                  </div>
                  <div className="p-2.5 bg-[#F7F8F5] flex items-center justify-between font-mono">
                    <span>POST /api/reviews</span>
                    <span className="text-[#57635D] font-sans">Draft analysis & findings generation</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between font-mono">
                    <span>POST /api/reviews/:id/decision</span>
                    <span className="text-[#57635D] font-sans">Human approval decision submission</span>
                  </div>
                  <div className="p-2.5 bg-[#F7F8F5] flex items-center justify-between font-mono">
                    <span>GET /api/audit</span>
                    <span className="text-[#57635D] font-sans">Full chronological audit log</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Team Member"
        description="Add a team member to participate in content reviews or guideline management."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#29332E] mb-1">Full Name</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Rachel Adams"
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#29332E] mb-1">Corporate Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="rachel.adams@acmehealth.com"
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#29332E] mb-1">Role & Permissions</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            >
              <option value="Brand Manager">Brand Manager (Full Administrative Access)</option>
              <option value="Reviewer">Reviewer (Approval & Rejection Authority)</option>
              <option value="Creator">Creator (Draft Submission & Correction Applying)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E8E1]">
            <Button variant="outline" size="sm" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleInvite}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
