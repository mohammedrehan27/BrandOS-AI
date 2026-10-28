import React, { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { useTheme, Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  variant?: 'icon' | 'dropdown' | 'segmented'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'icon',
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex items-center p-1 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] text-xs',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all',
            theme === 'light'
              ? 'bg-white text-[#29332E] shadow-sm font-semibold'
              : 'text-[#57635D] hover:text-[#29332E]'
          )}
          title="Light Theme"
        >
          <Sun className="w-3.5 h-3.5 text-[#C6974F]" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all',
            theme === 'dark'
              ? 'bg-[#18201C] text-[#F0F4F1] shadow-sm font-semibold'
              : 'text-[#57635D] hover:text-[#29332E]'
          )}
          title="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5 text-[#7774A8]" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all',
            theme === 'system'
              ? 'bg-white dark:bg-[#18201C] text-[#29332E] dark:text-[#F0F4F1] shadow-sm font-semibold'
              : 'text-[#57635D] hover:text-[#29332E]'
          )}
          title="System Preference"
        >
          <Monitor className="w-3.5 h-3.5 text-[#647C70]" />
          <span>System</span>
        </button>
      </div>
    )
  }

  return (
    <div className={cn('relative inline-block', className)} ref={menuRef}>
      <button
        type="button"
        onClick={toggleTheme}
        onContextMenu={(e) => {
          e.preventDefault()
          setDropdownOpen(!dropdownOpen)
        }}
        className={cn(
          'p-2 rounded-xl border border-[#E5E8E1] hover:bg-[#F7F8F5] text-[#57635D] transition-all relative flex items-center justify-center group',
          resolvedTheme === 'dark' ? 'text-[#F0F4F1]' : 'text-[#29332E]'
        )}
        title={`Current theme: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'} (Click to switch, right click for options)`}
        aria-label="Toggle display theme"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-[#9390C5] transition-transform duration-300 group-hover:-rotate-12" />
        ) : (
          <Sun className="w-4 h-4 text-[#C6974F] transition-transform duration-300 group-hover:rotate-45" />
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white border border-[#E5E8E1] rounded-xl shadow-elevated p-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
          <div className="px-2 py-1 text-[10px] font-semibold text-[#7E8C84] uppercase tracking-wider">
            Theme
          </div>
          <button
            type="button"
            onClick={() => {
              setTheme('light')
              setDropdownOpen(false)
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors',
              theme === 'light'
                ? 'bg-[#EFF3F0] text-[#29332E] font-semibold'
                : 'text-[#57635D] hover:bg-[#F7F8F5]'
            )}
          >
            <Sun className="w-3.5 h-3.5 text-[#C6974F]" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('dark')
              setDropdownOpen(false)
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors',
              theme === 'dark'
                ? 'bg-[#EFF3F0] text-[#29332E] font-semibold'
                : 'text-[#57635D] hover:bg-[#F7F8F5]'
            )}
          >
            <Moon className="w-3.5 h-3.5 text-[#7774A8]" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('system')
              setDropdownOpen(false)
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors',
              theme === 'system'
                ? 'bg-[#EFF3F0] text-[#29332E] font-semibold'
                : 'text-[#57635D] hover:bg-[#F7F8F5]'
            )}
          >
            <Monitor className="w-3.5 h-3.5 text-[#647C70]" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  )
}
