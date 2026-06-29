'use client'

import { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { fetchActivityLog, type ActivityLogEntry } from '@/app/actions/tasks'
import { getInitials } from '@/lib/utils/timeUtils'
import { formatDistanceToNow } from 'date-fns'

const ACTION_LABELS: Record<string, string> = {
  task_status_changed: 'changed status of',
  task_created: 'added task',
  task_completed: 'completed',
  task_self_assigned: 'self-assigned',
}

function formatEvent(entry: ActivityLogEntry): string {
  const action = ACTION_LABELS[entry.action_type] ?? entry.action_type
  const title = entry.task_title ? `"${entry.task_title}"` : 'a task'
  if (entry.action_type === 'task_status_changed' && entry.old_value && entry.new_value) {
    const oldLabel = entry.old_value.replace(/_/g, ' ')
    const newLabel = entry.new_value.replace(/_/g, ' ')
    return `changed ${title} from ${oldLabel} to ${newLabel}`
  }
  return `${action} ${title}`
}

export function AdminActivityFeed() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await fetchActivityLog(20)
    setEntries(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Poll every 15 seconds for new activity
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-7 w-7 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No recent activity.
      </p>
    )
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
      {entries.map((entry) => {
        const profile = entry.profiles
        const name = profile?.full_name ?? 'A student'
        const initials = getInitials(name)
        return (
          <div key={entry.id} className="flex items-start gap-2.5 text-xs">
            <Avatar className="h-6 w-6 shrink-0 mt-0.5">
              <AvatarFallback className="text-[10px] bg-gray-800 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="leading-snug">
                <span className="font-medium">{name}</span>{' '}
                <span className="text-muted-foreground">{formatEvent(entry)}</span>
              </p>
              <p className="text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
