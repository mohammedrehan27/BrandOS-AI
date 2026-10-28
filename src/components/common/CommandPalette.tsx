import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  FileCheck2,
  BookOpen,
  PlusCircle,
  BarChart3,
  History,
  Settings,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Modal } from './Modal'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  path?: string
  action?: () => void
  category: 'Navigation' | 'Actions' | 'Demo Reviews'
}

export const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else onClose() // handled in parent
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const items: CommandItem[] = [
    {
      id: 'cmd-new-review',
      title: 'Run Brand Review on Marketing Draft',
      subtitle: 'Paste copy or upload draft file',
      icon: <PlusCircle className="w-4 h-4 text-[#647C70]" />,
      path: '/review/new',
      category: 'Actions',
    },
    {
      id: 'cmd-review-flagship',
      title: 'ImmunoShield Pro Hero & Features Landing Page Copy',
      subtitle: 'REV-2025-089 • 2 Contradictions, 1 Need Verification',
      icon: <FileCheck2 className="w-4 h-4 text-[#7774A8]" />,
      path: '/review/REV-2025-089',
      category: 'Demo Reviews',
    },
    {
      id: 'cmd-nav-overview',
      title: 'Overview Dashboard',
      subtitle: 'KPI metrics, activity charts, and pending reviews',
      icon: <BarChart3 className="w-4 h-4 text-[#57635D]" />,
      path: '/',
      category: 'Navigation',
    },
    {
      id: 'cmd-nav-knowledge',
      title: 'Brand Knowledge Base',
      subtitle: 'Manage and upload approved corporate guideline PDFs',
      icon: <BookOpen className="w-4 h-4 text-[#57635D]" />,
      path: '/knowledge',
      category: 'Navigation',
    },
    {
      id: 'cmd-nav-queue',
      title: 'Review Queue',
      subtitle: 'Pending, in-progress, and approved content queue',
      icon: <FileCheck2 className="w-4 h-4 text-[#57635D]" />,
      path: '/queue',
      category: 'Navigation',
    },
    {
      id: 'cmd-nav-audit',
      title: 'Audit Trail',
      subtitle: 'Chronological immutable verification history',
      icon: <History className="w-4 h-4 text-[#57635D]" />,
      path: '/audit',
      category: 'Navigation',
    },
    {
      id: 'cmd-nav-analytics',
      title: 'Governance Analytics',
      subtitle: 'Repeated violations, claim verification trends',
      icon: <BarChart3 className="w-4 h-4 text-[#57635D]" />,
      path: '/analytics',
      category: 'Navigation',
    },
    {
      id: 'cmd-nav-settings',
      title: 'Workspace Settings & API Config',
      subtitle: 'Branding, team roles, thresholds, and Express API details',
      icon: <Settings className="w-4 h-4 text-[#57635D]" />,
      path: '/settings',
      category: 'Navigation',
    },
  ]

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (item: CommandItem) => {
    onClose()
    if (item.path) {
      navigate(item.path)
    } else if (item.action) {
      item.action()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="-m-6 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E5E8E1] gap-3 bg-[#F7F8F5]/60">
          <Search className="w-5 h-5 text-[#57635D] shrink-0" />
          <input
            type="text"
            placeholder="Search reviews, brand guidelines, actions, or jump to page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-0 text-sm text-[#29332E] placeholder-[#7E8C84] focus:outline-none focus:ring-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#57635D] bg-white border border-[#E5E8E1] rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="p-3 max-h-[360px] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#7E8C84]">
              No matching commands or reviews found for "{query}"
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F8F5] transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-white border border-[#E5E8E1] shadow-xs shrink-0 group-hover:border-[#D2D7CC]">
                    {item.icon}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#29332E] truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-[11px] text-[#57635D] truncate">{item.subtitle}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-[10px] text-[#7E8C84] px-1.5 py-0.5 bg-[#F7F8F5] rounded border border-[#E5E8E1]">
                    {item.category}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#7E8C84] group-hover:text-[#29332E] group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#E5E8E1] bg-[#F7F8F5] flex items-center justify-between text-[11px] text-[#7E8C84]">
          <span className="flex items-center gap-1.5">
            <img src="/brandos-emblem.png" alt="BrandOS AI" className="w-3.5 h-3.5 object-contain" />
            BrandOS AI Command Navigator
          </span>
          <span>Use ⌘K to open anytime</span>
        </div>
      </div>
    </Modal>
  )
}
