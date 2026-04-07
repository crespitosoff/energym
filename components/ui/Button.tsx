'use client'

import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const variantClasses = {
  primary: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white hover:shadow-glow focus-visible:ring-brand-500',
  secondary: 'bg-surface-200 hover:bg-surface-300 text-white/90 border border-white/5 hover:border-white/10 focus-visible:ring-white/20',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 focus-visible:ring-red-500/50',
  ghost: 'text-white/60 hover:text-white/90 hover:bg-white/5 focus-visible:ring-white/20',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-xl
          transition-all duration-200 ease-out
          active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0
          min-h-[44px]
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
