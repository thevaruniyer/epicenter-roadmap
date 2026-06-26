import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MonthProgressBar } from '@/components/charts/MonthProgressBar'
import { WeeklyLoadBar } from '@/components/charts/WeeklyLoadBar'
import { StatusBadge } from '@/components/tasks/StatusBadge'
import { CategoryTag } from '@/components/tasks/CategoryTag'
import { getWeekStart, getAcademicYearMonths, minutesToDisplay } from '@/lib/utils/timeUtils'
import { format } from 'date-fns'

export default async function StudentDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const weekStart = getWeekStart(today)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const [{ data: monthlyTasks }, { data: weeklyTasks }, { data: blockedTasks }] =
    await Promise.all([
      adminClient
        .from('tasks')
        .select('*')
        .eq('student_id', user.id)
        .eq('view_level', 'monthly')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('is_admin_assigned', true),
      adminClient
        .from('tasks')
        .select('*')
        .eq('student_id', user.id)
        .eq('view_level', 'weekly')
        .eq('week_start', weekStartStr),
      adminClient
        .from('tasks')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'blocked')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  const adminTasks = monthlyTasks ?? []
  const completedAdminTasks = adminTasks.filter((t) => t.status === 'done')
  const weekTasks = weeklyTasks ?? []
  const totalWeekMinutes = weekTasks.reduce((s, t) => s + t.estimated_minutes, 0)

  const months = getAcademicYearMonths()
  const currentMonthLabel = months.find(
    (m) => m.value === currentMonth && m.year === currentYear
  )?.label ?? 'This Month'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{currentMonthLabel} Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthProgressBar completed={completedAdminTasks.length} total={adminTasks.length} />
            <Link href="/monthly" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
              View monthly tasks →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyLoadBar totalMinutes={totalWeekMinutes} cap={profile.weekly_load_cap} />
            <p className="text-xs text-muted-foreground mt-2">{weekTasks.length} {weekTasks.length === 1 ? 'task' : 'tasks'} this week</p>
            <Link href="/weekly" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
              View weekly plan →
            </Link>
          </CardContent>
        </Card>
      </div>

      {(blockedTasks?.length ?? 0) > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              Blocked Tasks
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                {blockedTasks!.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {blockedTasks!.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <StatusBadge status="blocked" />
                <CategoryTag category={task.category} />
                <span className="font-medium truncate">{task.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { href: '/monthly', label: 'Monthly Tasks', desc: `${adminTasks.length} ${adminTasks.length === 1 ? 'task' : 'tasks'} assigned` },
          { href: '/weekly', label: 'Weekly Plan', desc: `${weekTasks.length} ${weekTasks.length === 1 ? 'task' : 'tasks'} • ${minutesToDisplay(totalWeekMinutes)} total` },
          { href: '/daily', label: "Today's Tasks", desc: `View daily schedule` },
        ].map(({ href, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-4 pb-4">
                <h3 className="font-semibold text-sm">{label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
