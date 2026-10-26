import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  iconColor?: string
  change?: number
  changeLabel?: string
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-brand-primary',
  change,
  changeLabel,
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isNeutral = change !== undefined && change === 0

  return (
    <div className={cn('bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive && <TrendingUp className="w-3.5 h-3.5 text-success" />}
              {isNegative && <TrendingDown className="w-3.5 h-3.5 text-danger" />}
              {isNeutral && <Minus className="w-3.5 h-3.5 text-gray-400" />}
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive && 'text-success',
                  isNegative && 'text-danger',
                  isNeutral && 'text-gray-400',
                )}
              >
                {isPositive && '+'}
                {change?.toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-400">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn('p-2.5 bg-gray-50 dark:bg-neutral-700 rounded-lg', iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
