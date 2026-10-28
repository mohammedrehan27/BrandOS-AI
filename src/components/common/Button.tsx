import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'indigo'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconRight,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-9.5',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
    }

    const variantStyles = {
      primary:
        'bg-[#647C70] hover:bg-[#53685E] active:bg-[#44554D] text-white shadow-sm focus:ring-[#647C70]',
      secondary:
        'bg-[#F1F0FA] hover:bg-[#E3E2F2] text-[#4B487A] border border-[#D8D6EF] focus:ring-[#7774A8]',
      indigo:
        'bg-[#7774A8] hover:bg-[#666396] text-white shadow-sm focus:ring-[#7774A8]',
      outline:
        'bg-white hover:bg-[#F7F8F5] text-[#29332E] border border-[#E5E8E1] hover:border-[#D2D7CC] focus:ring-[#647C70]',
      ghost:
        'bg-transparent hover:bg-[#EFF3F0] text-[#29332E] hover:text-[#29332E] focus:ring-[#647C70]',
      danger:
        'bg-[#F9EAEA] hover:bg-[#F3C7C7] text-[#9B2C2C] border border-[#F3C7C7] focus:ring-red-400',
      success:
        'bg-[#EAF3EB] hover:bg-[#D5EADB] text-[#22543D] border border-[#C6E1CD] focus:ring-green-500',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
