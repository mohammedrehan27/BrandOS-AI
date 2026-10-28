import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  FileSearch,
  ListTodo,
  History,
  BarChart3,
  Settings,
  PlusCircle,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Check,
  UserCheck,
  Building2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { authService, auditService, reviewService } from '@/api/client'
import { User, Workspace, AuditEvent, ReviewDraft } from '@/types'
import { DemoBanner } from '@/components/common/DemoBanner'
import { CommandPalette } from '@/components/common/CommandPalette'
import { Button } from '@/components/common/Button'
import { Drawer } from '@/components/common/Drawer'
import { ThemeToggle } from '@/components/common/ThemeToggle'

export const AppShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [recentAudits, setRecentAudits] = useState<AuditEvent[]>([])
  const [pendingReviews, setPendingReviews] = useState<ReviewDraft[]>([])

  useEffect(() => {
    const loadState = async () => {
      const [u, ws, wsList, uList, audits, reviews] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentWorkspace(),
        authService.getWorkspaces(),
        authService.getAllUsers(),
        auditService.getAuditEvents(),
        reviewService.getReviews({ status: 'ready_for_approval' }),
      ])
      setCurrentUser(u)
      setCurrentWorkspace(ws)
      setWorkspaces(wsList)
      setAllUsers(uList)
      setRecentAudits(audits.slice(0, 5))
      setPendingReviews(reviews)
    }
    loadState()
  }, [location.pathname])

  const handleSwitchUser = async (userId: string) => {
    const updated = await authService.switchUser(userId)
    setCurrentUser(updated)
    setUserMenuOpen(false)
  }

  const handleSwitchWorkspace = async (wsId: string) => {
    const updated = await authService.switchWorkspace(wsId)
    setCurrentWorkspace(updated)
    setWorkspaceMenuOpen(false)
  }

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Brand Knowledge', path: '/knowledge', icon: BookOpen },
    { label: 'Content Review', path: '/review/new', icon: FileSearch },
    { label: 'Review Queue', path: '/queue', icon: ListTodo, badge: pendingReviews.length },
    { label: 'Audit Trail', path: '/audit', icon: History },
    { label: 'Governance Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const path = location.pathname
    if (path === '/') return [{ label: 'Overview' }]
    if (path === '/knowledge') return [{ label: 'Brand Knowledge' }]
    if (path === '/review/new') return [{ label: 'Content Review', path: '/queue' }, { label: 'New Review' }]
    if (path.startsWith('/review/')) return [{ label: 'Content Review', path: '/queue' }, { label: 'Evidence & Findings' }]
    if (path === '/queue') return [{ label: 'Review Queue' }]
    if (path === '/audit') return [{ label: 'Audit Trail' }]
    if (path === '/analytics') return [{ label: 'Governance Analytics' }]
    if (path === '/settings') return [{ label: 'Settings' }]
    return [{ label: 'BrandOS AI' }]
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8F5] text-[#29332E]">
      {/* Top Demo Banner */}
      <DemoBanner />

      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Desktop Sidebar */}
        <aside
          className={cn(
            'hidden lg:flex flex-col border-r border-[#E5E8E1] bg-white transition-all duration-200 z-20 select-none shrink-0',
            sidebarCollapsed ? 'w-18' : 'w-64'
          )}
        >
          {/* Logo & Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#E5E8E1]">
            <NavLink to="/" className="flex items-center gap-2.5 group min-w-0">
              <img
                src="/brandos-emblem.png"
                alt="BrandOS AI Logo"
                className="w-8 h-8 rounded-lg object-contain shrink-0 transition-transform group-hover:scale-105"
              />
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm tracking-tight text-[#29332E] flex items-center gap-1">
                    BrandOS <span className="text-[#647C70] font-normal text-xs bg-[#EFF3F0] px-1 py-0.2 rounded border border-[#C2CEC7]">AI</span>
                  </span>
                  <span className="text-[10px] text-[#57635D] tracking-tight truncate">Verified Brand Governance</span>
                </div>
              )}
            </NavLink>
          </div>

          {/* Workspace Switcher */}
          <div className="p-3 border-b border-[#E5E8E1] relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-xl border border-[#E5E8E1] hover:bg-[#F7F8F5] hover:border-[#D2D7CC] transition-colors text-left',
                sidebarCollapsed && 'justify-center p-2'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#F1F0FA] text-[#7774A8] border border-[#D8D6EF] flex items-center justify-center shrink-0 text-xs font-semibold">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                {!sidebarCollapsed && (
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#29332E] truncate">
                      {currentWorkspace?.name || 'Acme Health Tech'}
                    </div>
                    <div className="text-[10px] text-[#57635D] truncate">
                      {currentWorkspace?.industry || 'Enterprise Plan'}
                    </div>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && <ChevronDown className="w-3.5 h-3.5 text-[#57635D] shrink-0" />}
            </button>

            {/* Workspace Dropdown */}
            {workspaceMenuOpen && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-[#E5E8E1] rounded-xl shadow-elevated p-1.5 z-50">
                <div className="px-2 py-1 text-[10px] font-semibold text-[#7E8C84] uppercase tracking-wider">
                  Select Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#F7F8F5] text-left"
                  >
                    <span className="font-medium text-[#29332E]">{ws.name}</span>
                    {ws.id === currentWorkspace?.id && (
                      <Check className="w-3.5 h-3.5 text-[#647C70]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="p-3">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center shadow-xs"
              onClick={() => navigate('/review/new')}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              {!sidebarCollapsed && <span>New Review</span>}
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group select-none',
                    isActive
                      ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]/60'
                      : 'text-[#57635D] hover:bg-[#F7F8F5] hover:text-[#29332E]',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-[#647C70]' : 'text-[#7E8C84] group-hover:text-[#29332E]'
                    )}
                  />
                  {!sidebarCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-[#FAF1E1] text-[#8C5E1A] rounded-full border border-[#F2DEC0]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* User Profile & Role Switcher */}
          <div className="p-3 border-t border-[#E5E8E1] relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F7F8F5] transition-colors text-left',
                sidebarCollapsed && 'justify-center p-1'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser?.name}
                  className="w-7 h-7 rounded-full object-cover border border-[#E5E8E1] shrink-0"
                />
                {!sidebarCollapsed && (
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#29332E] truncate">
                      {currentUser?.name || 'User'}
                    </div>
                    <div className="text-[10px] text-[#647C70] font-medium truncate flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" />
                      {currentUser?.role || 'Brand Manager'}
                    </div>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && <ChevronDown className="w-3.5 h-3.5 text-[#57635D] shrink-0" />}
            </button>

            {/* Persona Switcher Dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-[#E5E8E1] rounded-xl shadow-elevated p-2 z-50">
                <div className="px-2 py-1 text-[10px] font-semibold text-[#7E8C84] uppercase tracking-wider">
                  Switch Demo Persona
                </div>
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#F7F8F5] text-left"
                  >
                    <div>
                      <div className="font-medium text-[#29332E]">{u.name}</div>
                      <div className="text-[10px] text-[#57635D]">{u.role}</div>
                    </div>
                    {u.id === currentUser?.id && (
                      <Check className="w-3.5 h-3.5 text-[#647C70]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar Navigation */}
          <header className="h-14 px-4 sm:px-6 bg-white border-b border-[#E5E8E1] flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-subtle">
            {/* Left breadcrumb & mobile hamburger */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-[#57635D] hover:bg-[#F7F8F5]"
              >
                <Menu className="w-5 h-5" />
              </button>
              <NavLink to="/" className="lg:hidden shrink-0 flex items-center">
                <img
                  src="/brandos-emblem.png"
                  alt="BrandOS AI Logo"
                  className="w-6 h-6 object-contain"
                />
              </NavLink>

              <nav className="flex items-center gap-1.5 text-xs text-[#57635D] truncate">
                <span className="font-semibold text-[#29332E] hidden sm:inline">
                  {currentWorkspace?.name}
                </span>
                <span className="text-[#A4B0A9] hidden sm:inline">/</span>
                {getBreadcrumbs().map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-[#A4B0A9]">/</span>}
                    {crumb.path ? (
                      <NavLink
                        to={crumb.path}
                        className="hover:text-[#29332E] hover:underline"
                      >
                        {crumb.label}
                      </NavLink>
                    ) : (
                      <span className="text-[#29332E] font-medium">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Right Quick Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Spotlight / Command palette search button */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#E5E8E1] bg-[#F7F8F5] text-xs text-[#57635D] hover:border-[#D2D7CC] hover:text-[#29332E] transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Quick Jump...</span>
                <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-white border border-[#E5E8E1] rounded text-[#7E8C84]">
                  ⌘K
                </kbd>
              </button>

              {/* Notification Button */}
              <button
                onClick={() => setNotificationsOpen(true)}
                className="p-2 rounded-xl border border-[#E5E8E1] hover:bg-[#F7F8F5] text-[#57635D] relative transition-colors"
                title="Notifications & Audit Feed"
              >
                <Bell className="w-4 h-4" />
                {pendingReviews.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C6974F] rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Theme Toggle (Light / Dark) */}
              <ThemeToggle />

              {/* Compact New Review CTA for mobile / top bar */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/review/new')}
                className="hidden sm:inline-flex"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                New Review
              </Button>
            </div>
          </header>

          {/* Page Body Viewport */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Notifications / Activity Drawer */}
      <Drawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Live Governance Activity"
        description="Real-time audit log of submissions, findings, and approvals"
        width="md"
      >
        <div className="space-y-4">
          <div className="bg-[#FAF1E1] p-3 rounded-xl border border-[#F2DEC0] text-xs text-[#8C5E1A]">
            <span className="font-semibold">{pendingReviews.length} draft(s)</span> currently in Review Queue waiting for human sign-off.
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#29332E] uppercase tracking-wider mb-2">
              Recent Audit Log
            </h4>
            <div className="space-y-2.5">
              {recentAudits.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl border border-[#E5E8E1] bg-white text-xs space-y-1 hover:border-[#D2D7CC] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#7E8C84]">
                    <span className="font-semibold text-[#29332E]">{event.actor.name}</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[#57635D] leading-relaxed">{event.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                setNotificationsOpen(false)
                navigate('/audit')
              }}
            >
              View Full Audit Trail
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Mobile Sidebar Drawer */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <img src="/brandos-emblem.png" alt="BrandOS AI" className="w-5 h-5 object-contain" />
            <span>BrandOS AI Menu</span>
          </div>
        }
        description="Every claim verified. Every brand protected."
        width="md"
      >
        <div className="space-y-4">
          <Button
            variant="primary"
            size="md"
            className="w-full justify-center"
            onClick={() => {
              setMobileMenuOpen(false)
              navigate('/review/new')
            }}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            New Review
          </Button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate(item.path)
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-left text-sm hover:bg-[#F7F8F5] text-[#29332E]"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#647C70]" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7E8C84]" />
                </button>
              )
            })}
          </nav>

          <div className="pt-3 border-t border-[#E5E8E1] space-y-2">
            <div className="text-xs font-semibold text-[#7E8C84] uppercase tracking-wider">
              Display Theme
            </div>
            <ThemeToggle variant="segmented" className="w-full justify-between" />
          </div>
        </div>
      </Drawer>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
