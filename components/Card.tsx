import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'stat'
}

export default function Card({ children, className = '', variant = 'default' }: CardProps) {
  const variantClasses = {
    default: 'card',
    stat: 'stat-card',
  }

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-header ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`card-title ${className}`}>{children}</h2>
}
