import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/lib/types/app.types'

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100' },
  done: { label: 'Done', className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className} ${className ?? ''}`}>
      {config.label}
    </Badge>
  )
}
