import React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertOctagon, HelpCircle, Sparkles, Clock, AlertTriangle } from 'lucide-react'
import { FindingStatus, FindingSeverity, ReviewStatus } from '@/types'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'verified'
    | 'contradicted'
    | 'needs_verification'
    | 'info'
    | 'neutral'
    | 'severity_high'
    | 'severity_medium'
    | 'severity_low'
    | 'outline'
  size?: 'sm' | 'md'
  showIcon?: boolean
  label?: string
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  showIcon = true,
  label,
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }

  const variantStyles = {
    verified: 'bg-[#EAF3EB] text-[#22543D] border border-[#C6E1CD]',
    contradicted: 'bg-[#F9EAEA] text-[#9B2C2C] border border-[#F3C7C7]',
    needs_verification: 'bg-[#FAF1E1] text-[#8C5E1A] border border-[#F2DEC0]',
    info: 'bg-[#F1F0FA] text-[#4B487A] border border-[#D8D6EF]',
    neutral: 'bg-[#EFF1EC] text-[#57635D] border border-[#E5E8E1]',
    severity_high: 'bg-[#F9EAEA] text-[#9B2C2C] border border-[#F3C7C7] font-medium',
    severity_medium: 'bg-[#FAF1E1] text-[#8C5E1A] border border-[#F2DEC0] font-medium',
    severity_low: 'bg-[#EFF1EC] text-[#57635D] border border-[#E5E8E1]',
    outline: 'bg-white text-[#29332E] border border-[#E5E8E1]',
  }

  const renderIcon = () => {
    if (!showIcon) return null
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
    switch (variant) {
      case 'verified':
        return <CheckCircle2 className={cn(iconSize, 'text-[#2D6A4F] shrink-0')} />
      case 'contradicted':
        return <AlertOctagon className={cn(iconSize, 'text-[#9B2C2C] shrink-0')} />
      case 'needs_verification':
        return <HelpCircle className={cn(iconSize, 'text-[#C6974F] shrink-0')} />
      case 'info':
        return <Sparkles className={cn(iconSize, 'text-[#7774A8] shrink-0')} />
      case 'severity_high':
        return <AlertOctagon className={cn(iconSize, 'text-[#9B2C2C] shrink-0')} />
      case 'severity_medium':
        return <AlertTriangle className={cn(iconSize, 'text-[#C6974F] shrink-0')} />
      case 'severity_low':
        return <Clock className={cn(iconSize, 'text-[#57635D] shrink-0')} />
      default:
        return null
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full tracking-wide select-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {renderIcon()}
      <span>{label || children}</span>
    </span>
  )
}

// Helpers for domain specific badges
export const FindingStatusBadge: React.FC<{ status: FindingStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const map: Record<FindingStatus, { variant: BadgeProps['variant']; label: string }> = {
    verified: { variant: 'verified', label: 'Verified Claim' },
    contradicted: { variant: 'contradicted', label: 'Contradicted Rule' },
    needs_verification: { variant: 'needs_verification', label: 'Needs Verification' },
  }
  const config = map[status] || { variant: 'neutral', label: status }
  return <Badge variant={config.variant} size={size} label={config.label} />
}

export const SeverityBadge: React.FC<{ severity: FindingSeverity; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'sm',
}) => {
  const map: Record<FindingSeverity, { variant: BadgeProps['variant']; label: string }> = {
    high: { variant: 'severity_high', label: 'High Severity' },
    medium: { variant: 'severity_medium', label: 'Medium Severity' },
    low: { variant: 'severity_low', label: 'Low Severity' },
  }
  const config = map[severity]
  return <Badge variant={config.variant} size={size} label={config.label} />
}

export const ReviewStatusBadge: React.FC<{ status: ReviewStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  switch (status) {
    case 'approved':
      return <Badge variant="verified" size={size} label="Approved" />
    case 'rejected':
      return <Badge variant="contradicted" size={size} label="Rejected" />
    case 'changes_requested':
      return <Badge variant="needs_verification" size={size} label="Changes Requested" />
    case 'ready_for_approval':
      return <Badge variant="info" size={size} label="Ready for Review" />
    case 'in_progress':
      return <Badge variant="info" size={size} label="In Progress" />
    case 'pending':
    default:
      return <Badge variant="neutral" size={size} label="Pending Queue" />
  }
}
