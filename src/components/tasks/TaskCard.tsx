'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Lock, RotateCcw, Clock, Trash2, Info, MoreHorizontal,
  CheckCircle, Copy, AlarmClock,
} from 'lucide-react'
import { CategoryTag } from './CategoryTag'
import {
  updateTask,
  adminUpdateTask,
  deleteTask,
  adminDeleteTask,
  duplicateTask,
  approveTask,
} from '@/app/actions/tasks'
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
  onRefresh?: () => void
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
  onRefresh,
}: TaskCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showActualTimeDialog, setShowActualTimeDialog] = useState(false)
  const [actualMinutes, setActualMinutes] = useState('')
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)

  // Optimistic status update
  const [optimisticStatus, updateOptimisticStatus] = useOptimistic(
    task.status as TaskStatus,
    (_: TaskStatus, newStatus: TaskStatus) => newStatus
  )

  const canEdit = isAdmin || !task.is_locked
  const effectiveStudentId = studentId ?? task.student_id ?? ''

  function handleStatusChange(newStatus: string | null) {
    if (!newStatus || !canEdit) return
    setError(null)

    const typedStatus = newStatus as TaskStatus

    // If marking done and not admin, show actual time dialog
    if (typedStatus === 'done' && !isAdmin) {
      setPendingStatus(typedStatus)
      setShowActualTimeDialog(true)
      return
    }

    updateOptimisticStatus(typedStatus)
    startTransition(async () => {
      const result = isAdmin && effectiveStudentId
        ? await adminUpdateTask(task.id, { status: typedStatus }, effectiveStudentId)
        : await updateTask(task.id, { status: typedStatus })
      if (result?.error) setError(result.error)
    })
  }

  async function handleConfirmDone(minutes: number | null) {
    if (!pendingStatus) return
    setShowActualTimeDialog(false)
    updateOptimisticStatus(pendingStatus)
    startTransition(async () => {
      const result = await updateTask(task.id, {
        status: pendingStatus,
        ...(minutes !== null && { actualMinutes: minutes }),
      })
      if (result?.error) setError(result.error)
    })
    setPendingStatus(null)
    setActualMinutes('')
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return
    setError(null)
    startTransition(async () => {
      const result = isAdmin && effectiveStudentId
        ? await adminDeleteTask(task.id, effectiveStudentId)
        : await deleteTask(task.id)
      if (result?.error) setError(result.error)
    })
  }

  async function handleDuplicate() {
    setError(null)
    startTransition(async () => {
      const result = await duplicateTask(task.id, isAdmin, effectiveStudentId)
      if (result?.error) setError(result.error)
      else onRefresh?.()
    })
  }

  async function handleApprove() {
    if (!effectiveStudentId) return
    setError(null)
    startTransition(async () => {
      const result = await approveTask(task.id, effectiveStudentId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <>
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
                {task.scheduled_time && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                    <AlarmClock className="h-3 w-3" />
                    {task.scheduled_time.slice(0, 5)}
                  </span>
                )}
              </div>
              <h3 className="font-medium text-sm leading-tight">{task.title}</h3>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>

            {/* Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 opacity-0 group-hover:opacity-100"
                    disabled={isPending}
                  />
                }
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuGroup>
                  <button
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded cursor-pointer"
                    onClick={handleDuplicate}
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </button>
                  {(isAdmin || !task.is_admin_assigned) && (
                    <button
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                  {isAdmin && optimisticStatus === 'done' && !task.is_admin_approved && (
                    <button
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded cursor-pointer"
                      onClick={handleApprove}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </button>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Select
                  value={optimisticStatus}
                  onValueChange={handleStatusChange}
                  disabled={!canEdit || isPending}
                >
                  <SelectTrigger className="h-7 text-xs w-[130px]" size="sm">
                    <span className="flex-1 text-left truncate">
                      {STATUS_LABELS[optimisticStatus] ?? optimisticStatus}
                    </span>
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
                  <span
                    title="This task is locked by your advisor. Contact them to change the status."
                    className="absolute -right-5 top-1 cursor-help text-muted-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {minutesToDisplay(task.estimated_minutes)}
                {task.actual_minutes != null && (
                  <span className="text-gray-400"> / {minutesToDisplay(task.actual_minutes)} actual</span>
                )}
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

          {/* Approve button for admin (Done tasks) */}
          {isAdmin && optimisticStatus === 'done' && !task.is_admin_approved && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 w-full"
              onClick={handleApprove}
              disabled={isPending}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve &amp; archive
            </Button>
          )}

          {task.is_admin_approved && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              Approved
            </span>
          )}

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

      {/* Actual time dialog — shown when student marks a task Done */}
      <Dialog open={showActualTimeDialog} onOpenChange={setShowActualTimeDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>How long did this take?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Estimated: {minutesToDisplay(task.estimated_minutes)}
          </p>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder="Minutes"
              value={actualMinutes}
              onChange={(e) => setActualMinutes(e.target.value)}
              className="w-28 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleConfirmDone(actualMinutes ? parseInt(actualMinutes) : null)}
            >
              Save &amp; mark done
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConfirmDone(null)}
            >
              Skip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
