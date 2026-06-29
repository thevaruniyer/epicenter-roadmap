'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
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
import { MonthProgressBar } from '@/components/charts/MonthProgressBar'
import { WeeklyLoadBar } from '@/components/charts/WeeklyLoadBar'
import {
  fetchMonthlyTasks,
  fetchWeeklyTasks,
  fetchDailyTasks,
  fetchTimeInsights,
} from '@/app/actions/tasks'
import type { TimeInsightTask } from '@/app/actions/tasks'
import {
  getAcademicYearMonths,
  getWeekStart,
  formatWeekRange,
} from '@/lib/utils/timeUtils'
import { addWeeks, subWeeks, addDays, format } from 'date-fns'
import type { Task, Profile, FilterState, TaskCategory } from '@/lib/types/app.types'

interface AdminStudentTabsProps {
  student: Profile
  adminProfile?: Profile | null
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function AdminStudentTabs({ student, adminProfile: adminProfileProp }: AdminStudentTabsProps) {
  const months = getAcademicYearMonths()
  const today = new Date()
  const defaultMonth = months.find(
    (m) => m.value === today.getMonth() + 1 && m.year === today.getFullYear()
  ) ?? months[0]

  const [activeTab, setActiveTab] = useState('monthly')
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart())
  const [selectedDate, setSelectedDate] = useState<Date>(() => today)
  const [tasks, setTasks] = useState<Task[]>([])
  const adminProfile = adminProfileProp ?? null
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({ categories: [], statuses: [], assignedBy: 'all' })
  const [showAddTask, setShowAddTask] = useState(false)
  const [timeInsights, setTimeInsights] = useState<TimeInsightTask[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const loadTasks = useCallback(async () => {
    setLoading(true)

    let data: Task[] = []
    if (activeTab === 'monthly') {
      data = await fetchMonthlyTasks(student.id, selectedMonth.value, selectedMonth.year)
    } else if (activeTab === 'weekly') {
      data = await fetchWeeklyTasks(student.id, weekStartStr)
    } else {
      data = await fetchDailyTasks(student.id, dateStr)
    }

    setTasks(data)
    setLoading(false)
  }, [activeTab, selectedMonth, weekStartStr, dateStr, student.id])

  useEffect(() => { loadTasks() }, [loadTasks])

  useEffect(() => {
    if (activeTab !== 'insights') return
    if (timeInsights.length > 0) return
    setInsightsLoading(true)
    fetchTimeInsights(student.id).then(data => {
      setTimeInsights(data)
      setInsightsLoading(false)
    })
  }, [activeTab, student.id, timeInsights.length])

  const filteredTasks = tasks.filter((t) => {
    if (filters.categories.length > 0 && !filters.categories.includes(t.category as TaskCategory)) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false
    if (filters.assignedBy === 'admin' && !t.is_admin_assigned) return false
    if (filters.assignedBy === 'self' && t.is_admin_assigned) return false
    return true
  })

  const adminTasks = tasks.filter((t) => t.is_admin_assigned)
  const completedAdminTasks = adminTasks.filter((t) => t.status === 'done')
  const totalMinutes = tasks.reduce((s, t) => s + t.estimated_minutes, 0)

  function getViewLevelForTab() {
    if (activeTab === 'monthly') return 'monthly' as const
    if (activeTab === 'weekly') return 'weekly' as const
    return 'daily' as const
  }

  function getFormProps() {
    if (activeTab === 'monthly') return { month: selectedMonth.value, year: selectedMonth.year }
    if (activeTab === 'weekly') return { weekStart: weekStartStr }
    return { dayDate: dateStr }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="insights">Time Insights</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => setShowAddTask(true)}>+ Add task</Button>
        </div>

        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
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
            <MonthProgressBar completed={completedAdminTasks.length} total={adminTasks.length} />
          </div>
          <FilterBar filters={filters} onChange={setFilters} />
          <TaskGrid tasks={filteredTasks} loading={loading} isAdmin studentId={student.id} adminProfile={adminProfile} onRefresh={loadTasks} />
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>←</Button>
              <span className="text-sm font-medium px-2 flex items-center">{formatWeekRange(weekStart)}</span>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>→</Button>
            </div>
            <WeeklyLoadBar totalMinutes={totalMinutes} cap={student.weekly_load_cap} />
          </div>
          <FilterBar filters={filters} onChange={setFilters} />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS.map((day, i) => {
              const date = format(addDays(weekStart, i), 'yyyy-MM-dd')
              const dt = filteredTasks.filter((t) => t.day_date === date)
              const floats = i === 0 ? filteredTasks.filter((t) => !t.day_date) : []
              return (
                <div key={day} className="space-y-2">
                  <div className="text-xs font-medium text-center py-1 rounded text-gray-500">
                    {day}
                  </div>
                  {floats.map((t) => (
                    <TaskCard key={t.id} task={t} isAdmin studentId={student.id} assignedByProfile={adminProfile} />
                  ))}
                  {dt.map((t) => (
                    <TaskCard key={t.id} task={t} isAdmin studentId={student.id} assignedByProfile={adminProfile} />
                  ))}
                  {dt.length === 0 && floats.length === 0 && (
                    <div className="text-[10px] text-center text-gray-300 py-4">—</div>
                  )}
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>←</Button>
            <span className="text-sm font-medium px-2">{format(selectedDate, 'MMMM d, yyyy')}</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>→</Button>
          </div>
          <FilterBar filters={filters} onChange={setFilters} />
          <TaskGrid tasks={filteredTasks} loading={loading} isAdmin studentId={student.id} adminProfile={adminProfile} onRefresh={loadTasks} />
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <TimeInsightsPanel tasks={timeInsights} loading={insightsLoading} />
        </TabsContent>
      </Tabs>

      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task for {student.full_name}</DialogTitle>
          </DialogHeader>
          {adminProfile && (
            <TaskForm
              studentId={student.id}
              assignedById={adminProfile.id}
              viewLevel={getViewLevelForTab()}
              isAdminAssigned
              {...getFormProps()}
              onSuccess={() => { setShowAddTask(false); loadTasks() }}
              onCancel={() => setShowAddTask(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TaskGrid({
  tasks,
  loading,
  isAdmin,
  studentId,
  adminProfile,
  onRefresh,
}: {
  tasks: Task[]
  loading: boolean
  isAdmin?: boolean
  studentId?: string
  adminProfile?: Profile | null
  onRefresh: () => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm font-medium">No tasks for this period</p>
        <p className="text-xs mt-1">Use &quot;+ Add task&quot; to assign work for this student.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          assignedByProfile={adminProfile}
          isAdmin={isAdmin}
          studentId={studentId}
        />
      ))}
    </div>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  EC: '#6366f1',
  'SAT Prep': '#f59e0b',
  Essays: '#10b981',
  Academic: '#3b82f6',
  Admin: '#8b5cf6',
  Personal: '#ec4899',
}

function TimeInsightsPanel({ tasks, loading }: { tasks: TimeInsightTask[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded" />)}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm font-medium">No time data yet</p>
        <p className="text-xs mt-1">Students must log actual time when marking tasks done.</p>
      </div>
    )
  }

  // Category breakdown
  const byCategory: Record<string, { estimated: number; actual: number; count: number }> = {}
  for (const t of tasks) {
    if (!byCategory[t.category]) byCategory[t.category] = { estimated: 0, actual: 0, count: 0 }
    byCategory[t.category].estimated += t.estimated_minutes
    byCategory[t.category].actual += (t.actual_minutes ?? 0)
    byCategory[t.category].count++
  }

  const totalEst = tasks.reduce((s, t) => s + t.estimated_minutes, 0)
  const totalAct = tasks.reduce((s, t) => s + (t.actual_minutes ?? 0), 0)
  const maxBar = Math.max(...Object.values(byCategory).map(c => Math.max(c.estimated, c.actual)), 1)

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold">{tasks.length}</p>
          <p className="text-xs text-muted-foreground">tasks tracked</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{Math.round(totalEst / 60 * 10) / 10}h</p>
          <p className="text-xs text-blue-500">estimated</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${totalAct > totalEst ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`text-lg font-bold ${totalAct > totalEst ? 'text-red-700' : 'text-green-700'}`}>
            {Math.round(totalAct / 60 * 10) / 10}h
          </p>
          <p className={`text-xs ${totalAct > totalEst ? 'text-red-500' : 'text-green-500'}`}>actual</p>
        </div>
      </div>

      {/* Category bar chart (inline SVG) */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By Category</h3>
        <div className="space-y-3">
          {Object.entries(byCategory).map(([cat, data]) => {
            const estPct = Math.round((data.estimated / maxBar) * 100)
            const actPct = Math.round((data.actual / maxBar) * 100)
            const color = CATEGORY_COLORS[cat] ?? '#94a3b8'
            return (
              <div key={cat} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium" style={{ color }}>{cat}</span>
                  <span className="text-muted-foreground">
                    {data.count} task{data.count !== 1 ? 's' : ''} · {Math.round(data.estimated / 60 * 10) / 10}h est / {Math.round(data.actual / 60 * 10) / 10}h actual
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full opacity-40" style={{ width: `${estPct}%`, backgroundColor: color }} />
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${actPct}%`, backgroundColor: color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-3 h-2 bg-gray-400 rounded-full opacity-40" /> Estimated
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-3 h-2 bg-gray-400 rounded-full" /> Actual
          </div>
        </div>
      </div>

      {/* Per-task table */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Tasks</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium">Task</th>
                <th className="text-right px-3 py-2 font-medium">Est.</th>
                <th className="text-right px-3 py-2 font-medium">Actual</th>
                <th className="text-right px-3 py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.slice(0, 20).map((t, i) => {
                const delta = (t.actual_minutes ?? 0) - t.estimated_minutes
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 max-w-[200px] truncate">
                      <span className="font-medium">{t.title}</span>
                      <span className="ml-2 text-muted-foreground">{t.category}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{t.estimated_minutes}m</td>
                    <td className="px-3 py-2 text-right">{t.actual_minutes ?? '—'}m</td>
                    <td className={`px-3 py-2 text-right font-medium ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? '0' : delta}m
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
