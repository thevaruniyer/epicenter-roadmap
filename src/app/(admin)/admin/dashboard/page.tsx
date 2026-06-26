import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getWeekStart, getInitials } from '@/lib/utils/timeUtils'
import { format } from 'date-fns'
import type { Profile } from '@/lib/types/app.types'
import { CreateStudentDialog } from '@/components/admin/CreateStudentDialog'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: students } = await adminClient
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('full_name')

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const weekStart = getWeekStart(today)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const studentCards = await Promise.all(
    (students ?? []).map(async (student: Profile) => {
      const [{ data: monthlyTasks }, { data: weeklyTasks }, { data: blockedTasks }] =
        await Promise.all([
          adminClient
            .from('tasks')
            .select('status')
            .eq('student_id', student.id)
            .eq('view_level', 'monthly')
            .eq('month', currentMonth)
            .eq('year', currentYear)
            .eq('is_admin_assigned', true),
          adminClient
            .from('tasks')
            .select('id')
            .eq('student_id', student.id)
            .eq('view_level', 'weekly')
            .eq('week_start', weekStartStr),
          adminClient
            .from('tasks')
            .select('id')
            .eq('student_id', student.id)
            .eq('status', 'blocked'),
        ])

      const total = monthlyTasks?.length ?? 0
      const done = monthlyTasks?.filter((t) => t.status === 'done').length ?? 0
      const pct = total === 0 ? 0 : Math.round((done / total) * 100)

      return {
        profile: student,
        monthCompletionPercent: pct,
        monthCompletedCount: done,
        monthTotalCount: total,
        tasksThisWeekCount: weeklyTasks?.length ?? 0,
        blockedTasksCount: blockedTasks?.length ?? 0,
      }
    })
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {format(today, 'MMMM yyyy')} overview · {studentCards.length} {studentCards.length === 1 ? 'student' : 'students'}
          </p>
        </div>
        <CreateStudentDialog adminId={user.id} />
      </div>

      {studentCards.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No students yet. Create a student account to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studentCards.map(({ profile, monthCompletionPercent, monthCompletedCount, monthTotalCount, tasksThisWeekCount, blockedTasksCount }) => (
            <Link key={profile.id} href={`/admin/students/${profile.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#0f0f0f] text-white text-sm">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
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
  )
}
