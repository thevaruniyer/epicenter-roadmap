'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { FilterBar } from '@/components/tasks/FilterBar'
import { fetchDailyTasks, fetchProfilesByIds } from '@/app/actions/tasks'
import { minutesToDisplay } from '@/lib/utils/timeUtils'
import { format, addDays, subDays } from 'date-fns'
import type { Task, Profile, FilterState, TaskCategory } from '@/lib/types/app.types'

export default function DailyPage() {
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    statuses: [],
    assignedBy: 'all',
  })
  const [showAddTask, setShowAddTask] = useState(false)

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    setLoading(true)
    const data = await fetchDailyTasks(user.id, dateStr)
    setTasks(data)

    const assignedByIds = [
      ...new Set(data.map((t) => t.assigned_by).filter((id): id is string => Boolean(id))),
    ]
    const profileList = await fetchProfilesByIds(assignedByIds)
    const map: Record<string, Profile> = {}
    profileList.forEach((p) => {
      map[p.id] = p
    })
    setProfiles(map)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredTasks = tasks.filter((t) => {
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(t.category as TaskCategory)
    )
      return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false
    if (filters.assignedBy === 'admin' && !t.is_admin_assigned) return false
    if (filters.assignedBy === 'self' && t.is_admin_assigned) return false
    return true
  })

  const totalMinutes = tasks.reduce((s, t) => s + t.estimated_minutes, 0)
  const completedMinutes = tasks
    .filter((t) => t.status === 'done')
    .reduce((s, t) => s + t.estimated_minutes, 0)

  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" suppressHydrationWarning>
            {isToday ? 'Today' : format(selectedDate, 'EEEE')}
          </h1>
          <p className="text-sm text-gray-500" suppressHydrationWarning>{format(selectedDate, 'MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            ←
          </Button>
          <Button
            variant={isToday ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            →
          </Button>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-gray-600 bg-white rounded-lg border px-4 py-2.5">
          <span>
            <span className="font-semibold">{minutesToDisplay(totalMinutes)}</span> total
          </span>
          <span className="text-gray-300">|</span>
          <span>
            <span className="font-semibold text-green-600">
              {minutesToDisplay(completedMinutes)}
            </span>{' '}
            done
          </span>
          <span className="text-gray-300">|</span>
          <span>
            {tasks.filter((t) => t.status === 'done').length}/{tasks.length} tasks complete
          </span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <FilterBar filters={filters} onChange={setFilters} />
        <Button size="sm" variant="outline" onClick={() => setShowAddTask(true)}>
          + Add task
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">
            {isToday ? 'Nothing scheduled for today' : 'No tasks for this day'}
          </p>
          {isToday && (
            <p className="text-xs mt-1">Add a task or pull one from your weekly plan.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assignedByProfile={task.assigned_by ? profiles[task.assigned_by] : null}
            />
          ))}
        </div>
      )}

      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task for today</DialogTitle>
          </DialogHeader>
          {userId && (
            <TaskForm
              studentId={userId}
              viewLevel="daily"
              dayDate={dateStr}
              isAdminAssigned={false}
              onSuccess={() => {
                setShowAddTask(false)
                loadData()
              }}
              onCancel={() => setShowAddTask(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
