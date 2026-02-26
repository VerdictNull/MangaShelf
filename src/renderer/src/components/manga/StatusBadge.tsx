import { cn } from '@renderer/lib/cn'
import type { ReadStatus } from '@shared/types'
import { READ_STATUS_LABELS } from '@renderer/lib/formatters'

interface StatusBadgeProps {
  status: ReadStatus
  className?: string
}

const STATUS_BG: Record<ReadStatus, string> = {
  reading: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
  dropped: 'bg-destructive/15 text-destructive',
  on_hold: 'bg-warning/15 text-warning',
  plan_to_read: 'bg-muted text-muted-foreground'
}

export function StatusBadge({ status, className }: StatusBadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        STATUS_BG[status],
        className
      )}
    >
      {READ_STATUS_LABELS[status]}
    </span>
  )
}
