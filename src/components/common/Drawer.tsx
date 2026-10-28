import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  width?: 'md' | 'lg' | 'xl' | '2xl'
  footer?: React.ReactNode
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = 'lg',
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthStyles = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#29332E]/25 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer Surface */}
      <div
        className={cn(
          'relative w-full h-full bg-white border-l border-[#E5E8E1] shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-200',
          widthStyles[width]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#E5E8E1] bg-[#F7F8F5]/50">
          <div>
            {title && <h3 className="text-base font-semibold text-[#29332E]">{title}</h3>}
            {description && <p className="text-xs text-[#57635D] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#57635D] hover:text-[#29332E] hover:bg-[#E5E8E1]/60 rounded-lg transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div className="p-4 border-t border-[#E5E8E1] bg-[#F7F8F5]/80 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
