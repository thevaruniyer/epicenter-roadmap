'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskCard } from '@/components/tasks/TaskCard'
import { FilterBar } from '@/components/tasks/FilterBar'
import { MonthProgressBar } from '@/components/charts/MonthProgressBar'
import {
  fetchMonthlyTasks,
  fetchProfilesByIds,
  pullTaskToWeekly,
} from '@/app/actions/tasks'
import { getAcademicYearMonths, getWeekStart } from '@/lib/utils/timeUtils'
import { format, addWeeks } from 'date-fns'
import type { Task, Profile, FilterState, TaskCategory } from '@/lib/types/app.types'

export default function MonthlyPage() {
  const months = getAcademicYearMonths()
  const today = new Date()
  const defaultMonth =
    months.find((m) => m.value === today.getMonth() + 1 && m.year === today.getFullYear()) ??
    months[0]

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    statuses: [],
    assignedBy: 'all',
  })
  const [addToWeeklyTaskId, setAddToWeeklyTaskId] = useState<string | null>(null)
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0)
  const [isPulling, startPullTransition] = useTransition()
  const [pullError, setPullError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      setLoading(true)
      const data = await fetchMonthlyTasks(user.id, selectedMonth.value, selectedMonth.year)
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
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const filteredTasks = tasks.filter((t) => {
    if (filters.categories.length > 0 && !filters.categories.includes(t.category as TaskCategory))
      return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false
    if (filters.assignedBy === 'admin' && !t.is_admin_assigned) return false
    if (filters.assignedBy === 'self' && t.is_admin_assigned) return false
    return true
  })

  const grouped = filteredTasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.category]) acc[task.category] = []
    acc[task.category].push(task)
    return acc
  }, {})

  const adminTasks = tasks.filter((t) => t.is_admin_assigned)
  const completedAdminTasks = adminTasks.filter((t) => t.status === 'done')

  const weekStart = getWeekStart(today)
  const weekOptions = Array.from({ length: 8 }, (_, i) => {
    const ws = addWeeks(weekStart, i)
    return {
      offset: i,
      label: format(ws, 'MMM d') + ' week',
      value: format(ws, 'yyyy-MM-dd'),
    }
  })

  async function handlePullToWeekly() {
    if (!addToWeeklyTaskId || !userId) return
    setPullError(null)
    const weekValue = weekOptions[selectedWeekOffset]?.value
    if (!weekValue) return
    startPullTransition(async () => {
      const result = await pullTaskToWeekly(addToWeeklyTaskId, userId, weekValue)
      if (result?.error) {
        setPullError(result.error)
      } else {
        setAddToWeeklyTaskId(null)
        setSelectedWeekOffset(0)
        // Refresh tasks
        const data = await fetchMonthlyTasks(userId, selectedMonth.value, selectedMonth.year)
        setTasks(data)
      }
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Monthly Tasks</h1>
        <Select
          value={`${selectedMonth.value}-${selectedMonth.year}`}
          onValueChange={(val) => {
            const found = months.find((m) => `${m.value}-${m.year}` === val)
            if (found) setSelectedMonth(found)
          }}
        >
          <SelectTrigger className="w-44">
            <span>{selectedMonth.label} {selectedMonth.year}</span>
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={`${m.value}-${m.year}`} value={`${m.value}-${m.year}`}>
                {m.label} {m.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MonthProgressBar completed={completedAdminTasks.length} total={adminTasks.length} />

      <FilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">No tasks for this month</p>
          <p className="text-xs mt-1">Your advisor will assign tasks here soon.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catTasks]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {category}{' '}
                <span className="text-gray-400 font-normal">({catTasks.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedByProfile={task.assigned_by ? profiles[task.assigned_by] : null}
                    showAddToWeekly
                    onAddToWeekly={(id) => setAddToWeeklyTaskId(id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!addToWeeklyTaskId}
        onOpenChange={(open) => !open && setAddToWeeklyTaskId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to weekly plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Select the week to add this task to:
            </p>
            <Select
              value={String(selectedWeekOffset)}
              onValueChange={(v) => {
                if (v) setSelectedWeekOffset(parseInt(v))
              }}
            >
              <SelectTrigger>
                <span>{weekOptions[selectedWeekOffset]?.label ?? 'Select week'}</span>
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((w) => (
                  <SelectItem key={w.offset} value={String(w.offset)}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pullError && <p className="text-xs text-red-600">{pullError}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handlePullToWeekly}
                disabled={isPulling}
                className="flex-1"
              >
                {isPulling ? 'Adding...' : 'Add to plan'}
              </Button>
              <Button variant="outline" onClick={() => setAddToWeeklyTaskId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
