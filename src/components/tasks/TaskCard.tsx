'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Lock, RotateCcw, Clock, Trash2, Info } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { CategoryTag } from './CategoryTag'
import { updateTask, adminUpdateTask, deleteTask, adminDeleteTask } from '@/app/actions/tasks'
import { minutesToDisplay } from '@/lib/utils/timeUtils'
import type { Task, Profile, TaskStatus } from '@/lib/types/app.types'

interface TaskCardProps {
  task: Task
  assignedByProfile?: Profile | null
  isAdmin?: boolean
  studentId?: string
  onAddToWeekly?: (taskId: string) => void
  onAddToDaily?: (taskId: string) => void
  showAddToWeekly?: boolean
  showAddToDaily?: boolean
}

const STATUS_OPTIONS: TaskStatus[] = ['not_started', 'in_progress', 'done', 'blocked']
const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

export function TaskCard({
  task,
  assignedByProfile,
  isAdmin = false,
  studentId,
  onAddToWeekly,
  onAddToDaily,
  showAddToWeekly = false,
  showAddToDaily = false,
}: TaskCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canEdit = isAdmin || !task.is_locked

  function handleStatusChange(newStatus: string | null) {
    if (!newStatus || !canEdit) return
    setError(null)
    startTransition(async () => {
      const result =
        isAdmin && studentId
          ? await adminUpdateTask(task.id, { status: newStatus as TaskStatus }, studentId)
          : await updateTask(task.id, { status: newStatus as TaskStatus })
      if (result?.error) setError(result.error)
    })
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return
    setError(null)
    startTransition(async () => {
      const result =
        isAdmin && studentId
          ? await adminDeleteTask(task.id, studentId)
          : await deleteTask(task.id)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Card className={`group relative ${isPending ? 'opacity-60' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <CategoryTag category={task.category} />
              {task.is_locked && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                </span>
              )}
              {task.is_carried_over && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                  <RotateCcw className="h-3 w-3" />
                  Carried over{task.carry_forward_count > 1 ? ` ×${task.carry_forward_count}` : ''}
                </span>
              )}
              {!task.is_carried_over && task.parent_monthly_task_id && (
                <span className="text-xs text-muted-foreground">From monthly</span>
              )}
            </div>
            <h3 className="font-medium text-sm leading-tight">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Select
                value={task.status}
                onValueChange={handleStatusChange}
                disabled={!canEdit || isPending}
              >
                <SelectTrigger className="h-7 text-xs w-[130px]" size="sm">
                  <span className="flex-1 text-left truncate">{STATUS_LABELS[task.status as TaskStatus] ?? task.status}</span>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canEdit && (
                <span title="This task is locked by your advisor. Contact them to change the status." className="absolute -right-5 top-1 cursor-help text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {minutesToDisplay(task.estimated_minutes)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {showAddToWeekly && onAddToWeekly && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAddToWeekly(task.id)}
              >
                + Add to week
              </Button>
            )}
            {showAddToDaily && onAddToDaily && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAddToDaily(task.id)}
              >
                + Add to today
              </Button>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {task.is_admin_assigned ? (
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Assigned by {assignedByProfile?.full_name ?? 'Admin'}
            </span>
          ) : (
            <span>Self-assigned</span>
          )}
        </div>

        {task.notes && (
          <p className="text-xs text-muted-foreground bg-gray-50 rounded p-2 border">
            {task.notes}
          </p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
