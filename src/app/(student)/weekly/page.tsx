'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { FilterBar } from '@/components/tasks/FilterBar'
import { WeeklyLoadBar } from '@/components/charts/WeeklyLoadBar'
import {
  fetchWeeklyTasks,
  fetchProfilesByIds,
  fetchStudentProfile,
  fetchWeeklyReflection,
  performCarryForward,
  pullTaskToDaily,
  saveReflection,
  updateTask,
} from '@/app/actions/tasks'
import { getWeekStart, formatWeekRange, minutesToDisplay } from '@/lib/utils/timeUtils'
import { addWeeks, subWeeks, addDays, format } from 'date-fns'
import type { Task, Profile, FilterState, TaskCategory, WeeklyReflection } from '@/lib/types/app.types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyPage() {
  const supabase = createClient()

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart())
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [reflection, setReflection] = useState<WeeklyReflection | null>(null)
  const [reflectionContent, setReflectionContent] = useState('')
  const [reflectionMood, setReflectionMood] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [weeklyLoadCap, setWeeklyLoadCap] = useState(600)
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    statuses: [],
    assignedBy: 'all',
  })
  const [showAddTask, setShowAddTask] = useState(false)
  const [addToDailyTaskId, setAddToDailyTaskId] = useState<string | null>(null)
  const [isPulling, startPullTransition] = useTransition()
  const [isSavingReflection, startReflectionTransition] = useTransition()
  const [reflectionSaved, setReflectionSaved] = useState(false)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const profile = await fetchStudentProfile(user.id)
    if (profile) setWeeklyLoadCap(profile.weekly_load_cap)

    await performCarryForward(user.id, weekStartStr)

    setLoading(true)
    const [taskData, reflectionData] = await Promise.all([
      fetchWeeklyTasks(user.id, weekStartStr),
      fetchWeeklyReflection(user.id, weekStartStr),
    ])

    setTasks(taskData)
    setReflection(reflectionData)
    setReflectionContent(reflectionData?.content ?? '')
    setReflectionMood(reflectionData?.mood ?? '')

    const assignedByIds = [
      ...new Set(
        taskData.map((t) => t.assigned_by).filter((id): id is string => Boolean(id))
      ),
    ]
    const profileList = await fetchProfilesByIds(assignedByIds)
    const map: Record<string, Profile> = {}
    profileList.forEach((p) => {
      map[p.id] = p
    })
    setProfiles(map)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartStr])

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

  const floatingTasks = filteredTasks.filter((t) => !t.day_date)
  const dayTasks = (dayIndex: number) => {
    const date = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd')
    return filteredTasks.filter((t) => t.day_date === date)
  }

  const dayMinutes = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(weekStart, i), 'yyyy-MM-dd')
    return tasks.filter((t) => t.day_date === date).reduce((s, t) => s + t.estimated_minutes, 0)
  })
  const maxDayMin = Math.max(...dayMinutes, 1)

  async function handlePullToDaily() {
    if (!addToDailyTaskId || !userId) return
    const today = format(new Date(), 'yyyy-MM-dd')
    startPullTransition(async () => {
      await pullTaskToDaily(addToDailyTaskId, userId, today)
      setAddToDailyTaskId(null)
      loadData()
    })
  }

  async function handleAssignDay(taskId: string, dayDate: string | null) {
    await updateTask(taskId, { dayDate: dayDate ?? undefined })
    loadData()
  }

  async function handleSaveReflection() {
    if (!userId) return
    setReflectionSaved(false)
    startReflectionTransition(async () => {
      await saveReflection(userId, weekStartStr, reflectionContent, reflectionMood || null)
      setReflectionSaved(true)
      setTimeout(() => setReflectionSaved(false), 3000)
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Plan</h1>
          <p className="text-sm text-gray-500">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(getWeekStart())}
          >
            This week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          >
            →
          </Button>
        </div>
      </div>

      {userId && <WeeklyLoadBar totalMinutes={totalMinutes} cap={weeklyLoadCap} />}

      {/* Daily load mini bar chart */}
      <div className="flex items-end gap-1 h-10">
        {dayMinutes.map((min, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full bg-blue-200 rounded-t"
              style={{ height: `${Math.round((min / maxDayMin) * 36)}px` }}
              title={`${DAYS[i]}: ${minutesToDisplay(min)}`}
            />
            <span className="text-[10px] text-gray-400">{DAYS[i]}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <FilterBar filters={filters} onChange={setFilters} />
        <Button size="sm" variant="outline" onClick={() => setShowAddTask(true)}>
          + Add task
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {floatingTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                This week (unscheduled)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {floatingTasks.map((task) => (
                  <div key={task.id} className="space-y-1">
                    <TaskCard
                      task={task}
                      assignedByProfile={task.assigned_by ? profiles[task.assigned_by] : null}
                      showAddToDaily
                      onAddToDaily={(id) => setAddToDailyTaskId(id)}
                    />
                    <Select
                      value=""
                      onValueChange={(v) => handleAssignDay(task.id, v ?? null)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="Assign to day..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day, i) => {
                          const date = format(addDays(weekStart, i), 'yyyy-MM-dd')
                          return (
                            <SelectItem key={day} value={date} className="text-xs">
                              {day} {format(addDays(weekStart, i), 'M/d')}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS.map((day, i) => {
              const date = format(addDays(weekStart, i), 'yyyy-MM-dd')
              const dt = dayTasks(i)
              const isToday = date === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={day} className="space-y-2">
                  <div
                    className={`text-xs font-medium text-center py-1 rounded ${
                      isToday ? 'bg-blue-100 text-blue-700' : 'text-gray-500'
                    }`}
                  >
                    {day}
                    <div className="text-[10px]">{format(addDays(weekStart, i), 'M/d')}</div>
                  </div>
                  {dt.length === 0 ? (
                    <div className="text-[10px] text-center text-gray-300 py-4">—</div>
                  ) : (
                    dt.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        assignedByProfile={
                          task.assigned_by ? profiles[task.assigned_by] : null
                        }
                        showAddToDaily
                        onAddToDaily={(id) => setAddToDailyTaskId(id)}
                      />
                    ))
                  )}
                </div>
              )
            })}
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm font-medium">No tasks this week</p>
              <p className="text-xs mt-1">Pull tasks from your monthly plan or add your own.</p>
            </div>
          )}
        </>
      )}

      {/* Weekly Reflection */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Weekly Reflection</h3>
            <Select
              value={reflectionMood}
              onValueChange={(v) => setReflectionMood(v ?? '')}
            >
              <SelectTrigger className="w-32 h-7 text-xs">
                <span className="flex-1 text-left">
                  {reflectionMood
                    ? reflectionMood.charAt(0).toUpperCase() + reflectionMood.slice(1)
                    : 'How was it?'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: 'great', label: 'Great' },
                  { value: 'good', label: 'Good' },
                  { value: 'okay', label: 'Okay' },
                  { value: 'tough', label: 'Tough' },
                ].map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="How did this week go? What did you accomplish? What challenged you?"
            value={reflectionContent}
            onChange={(e) => setReflectionContent(e.target.value)}
            rows={4}
            className="text-sm resize-none"
          />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveReflection}
              disabled={isSavingReflection}
            >
              {isSavingReflection
                ? 'Saving...'
                : reflection
                ? 'Update reflection'
                : 'Save reflection'}
            </Button>
            {reflectionSaved && (
              <span className="text-xs text-green-600">Saved!</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add task dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task for this week</DialogTitle>
          </DialogHeader>
          {userId && (
            <TaskForm
              studentId={userId}
              viewLevel="weekly"
              weekStart={weekStartStr}
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

      {/* Add to daily dialog */}
      <Dialog
        open={!!addToDailyTaskId}
        onOpenChange={(open) => !open && setAddToDailyTaskId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to today's plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create a daily task for {format(new Date(), 'MMMM d, yyyy')}.
          </p>
          <div className="flex gap-2">
            <Button onClick={handlePullToDaily} disabled={isPulling} className="flex-1">
              {isPulling ? 'Adding...' : 'Add to today'}
            </Button>
            <Button variant="outline" onClick={() => setAddToDailyTaskId(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
