import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  subtitle?: string
}

export default function StatCard({ 
  label, 
  value, 
  icon, 
  colorScheme = 'blue',
  subtitle 
}: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
      label: 'text-blue-700',
      value: '!bg-gradient-to-r !from-blue-600 !to-blue-800',
      subtitle: 'text-blue-600',
      iconBg: 'bg-blue-500',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
      label: 'text-green-700',
      value: '!bg-gradient-to-r !from-green-600 !to-green-800',
      subtitle: 'text-green-600',
      iconBg: 'bg-green-500',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200',
      label: 'text-purple-700',
      value: '!bg-gradient-to-r !from-purple-600 !to-purple-800',
      subtitle: 'text-purple-600',
      iconBg: 'bg-purple-500',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
      label: 'text-orange-700',
      value: '!bg-gradient-to-r !from-orange-600 !to-orange-800',
      subtitle: 'text-orange-600',
      iconBg: 'bg-orange-500',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
      label: 'text-red-700',
      value: '!bg-gradient-to-r !from-red-600 !to-red-800',
      subtitle: 'text-red-600',
      iconBg: 'bg-red-500',
    },
  }

  const colors = colorClasses[colorScheme]

  return (
    <div className={`stat-card ${colors.bg}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`stat-label ${colors.label}`}>{label}</p>
          <p className={`stat-value ${colors.value} bg-clip-text text-transparent`}>{value}</p>
          {subtitle && <p className={`text-xs ${colors.subtitle} mt-2`}>{subtitle}</p>}
        </div>
        <div className={`w-16 h-16 rounded-2xl ${colors.iconBg} flex items-center justify-center shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  )
}
