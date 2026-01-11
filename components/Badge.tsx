import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral'
  className?: string
}

export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variantClasses = {
    success: 'badge-success',
    warning: 'badge-warning',
    info: 'badge-info',
    danger: 'badge-danger',
    neutral: 'badge-neutral',
  }

  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
