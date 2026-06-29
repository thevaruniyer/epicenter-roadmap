import { Suspense } from 'react'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { getWeekStart, getInitials } from '@/lib/utils/timeUtils'
import { format } from 'date-fns'
import { CreateStudentDialog } from '@/components/admin/CreateStudentDialog'
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const weekStartStr = format(getWeekStart(today), 'yyyy-MM-dd')

  // Try to use materialized view for fast loading; fall back to direct queries
  const { data: progressRows } = await adminClient
    .from('student_progress_summary')
    .select('*')

  let studentCards: {
    id: string
    full_name: string
    username: string
    monthCompletionPercent: number
    monthCompletedCount: number
    monthTotalCount: number
    tasksThisWeekCount: number
    blockedTasksCount: number
  }[] = []

  if (progressRows && progressRows.length > 0) {
    // Use materialized view data
    studentCards = progressRows.map((row) => {
      const total = Number(row.total_admin_tasks_month ?? 0)
      const done = Number(row.completed_admin_tasks_month ?? 0)
      const pct = total === 0 ? 0 : Math.round((done / total) * 100)
      return {
        id: row.student_id,
        full_name: row.full_name,
        username: row.username,
        monthCompletionPercent: pct,
        monthCompletedCount: done,
        monthTotalCount: total,
        tasksThisWeekCount: Number(row.tasks_this_week ?? 0),
        blockedTasksCount: Number(row.blocked_tasks ?? 0),
      }
    })
  } else {
    // Fallback: direct queries
    const { data: students } = await adminClient
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name')

    studentCards = await Promise.all(
      (students ?? []).map(async (student) => {
        const [{ data: monthlyTasks }, { data: weeklyTasks }, { data: blockedTasks }] =
          await Promise.all([
            adminClient.from('tasks').select('status')
              .eq('student_id', student.id).eq('view_level', 'monthly')
              .eq('month', currentMonth).eq('year', currentYear).eq('is_admin_assigned', true),
            adminClient.from('tasks').select('id')
              .eq('student_id', student.id).eq('view_level', 'weekly').eq('week_start', weekStartStr),
            adminClient.from('tasks').select('id')
              .eq('student_id', student.id).eq('status', 'blocked'),
          ])
        const total = monthlyTasks?.length ?? 0
        const done = monthlyTasks?.filter((t) => t.status === 'done').length ?? 0
        return {
          id: student.id,
          full_name: student.full_name,
          username: student.username,
          monthCompletionPercent: total === 0 ? 0 : Math.round((done / total) * 100),
          monthCompletedCount: done,
          monthTotalCount: total,
          tasksThisWeekCount: weeklyTasks?.length ?? 0,
          blockedTasksCount: blockedTasks?.length ?? 0,
        }
      })
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {format(today, 'MMMM yyyy')} overview · {studentCards.length}{' '}
            {studentCards.length === 1 ? 'student' : 'students'}
          </p>
        </div>
        <CreateStudentDialog adminId={user.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student cards — left 2 columns */}
        <div className="lg:col-span-2">
          {studentCards.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No students yet. Create a student account to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentCards.map(({ id, full_name, username, monthCompletionPercent, monthCompletedCount, monthTotalCount, tasksThisWeekCount, blockedTasksCount }) => (
                <Link key={id} href={`/admin/students/${id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="pt-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#0f0f0f] text-white text-sm">
                            {getInitials(full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{full_name}</p>
                          <p className="text-xs text-muted-foreground">@{username}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Month progress</span>
                          <span>{monthCompletedCount}/{monthTotalCount} ({monthCompletionPercent}%)</span>
                        </div>
                        <Progress value={monthCompletionPercent} className="h-1.5 [&>div]:bg-green-500" />
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
                          <p className="text-lg font-bold text-gray-800">{tasksThisWeekCount}</p>
                          <p className="text-[10px] text-muted-foreground">tasks this week</p>
                        </div>
                        {blockedTasksCount > 0 ? (
                          <div className="flex-1 bg-red-50 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-red-600">{blockedTasksCount}</p>
                            <p className="text-[10px] text-red-500">blocked</p>
                          </div>
                        ) : (
                          <div className="flex-1 bg-green-50 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-green-600">0</p>
                            <p className="text-[10px] text-green-500">blocked</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed — right column */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              }>
                <AdminActivityFeed />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
