import { cn } from '@/lib/utils'
import { getStatusBadge } from '@/lib/utils'

const variantClasses: Record<string, string> = {
  green:  'bg-green-50 text-green-700 ring-green-200',
  red:    'bg-red-50 text-red-700 ring-red-200',
  yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  blue:   'bg-blue-50 text-blue-700 ring-blue-200',
  gray:   'bg-gray-50 text-gray-600 ring-gray-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
}

interface BadgeProps {
  status?: string
  variant?: keyof typeof variantClasses
  label?: string
  className?: string
}

export function Badge({ status, variant, label, className }: BadgeProps) {
  let displayLabel = label
  let displayVariant = variant ?? 'gray'

  if (status && !label) {
    const info = getStatusBadge(status)
    displayLabel = info.label
    displayVariant = info.variant as keyof typeof variantClasses
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1',
        variantClasses[displayVariant] ?? variantClasses.gray,
        className,
      )}
    >
      {displayLabel ?? status}
    </span>
  )
}
