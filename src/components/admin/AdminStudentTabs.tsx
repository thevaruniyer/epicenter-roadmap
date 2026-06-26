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
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
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

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const loadTasks = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('student_id', student.id)

    if (activeTab === 'monthly') {
      query = query
        .eq('view_level', 'monthly')
        .eq('month', selectedMonth.value)
        .eq('year', selectedMonth.year)
    } else if (activeTab === 'weekly') {
      query = query
        .eq('view_level', 'weekly')
        .eq('week_start', weekStartStr)
    } else {
      query = query
        .eq('view_level', 'daily')
        .eq('day_date', dateStr)
    }

    const { data } = await query.order('created_at', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }, [activeTab, selectedMonth, weekStartStr, dateStr, student.id])

  useEffect(() => { loadTasks() }, [loadTasks])

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
