import { subWeeks, format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

export async function carryForwardTasks(
  supabase: SupabaseClient<Database>,
  studentId: string,
  currentWeekStart: Date
): Promise<void> {
  const lastWeekStart = subWeeks(currentWeekStart, 1)
  const lastWeekStartStr = format(lastWeekStart, 'yyyy-MM-dd')
  const currentWeekStartStr = format(currentWeekStart, 'yyyy-MM-dd')

  const { data: lastWeekTasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'weekly')
    .eq('week_start', lastWeekStartStr)
    .neq('status', 'done')

  if (error || !lastWeekTasks) return

  for (const task of lastWeekTasks) {
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('student_id', studentId)
      .eq('original_task_id', task.id)
      .eq('week_start', currentWeekStartStr)
      .eq('is_carried_over', true)
      .maybeSingle()

    if (existing) continue

    await supabase.from('tasks').insert({
      student_id: task.student_id,
      assigned_by: task.assigned_by,
      title: task.title,
      description: task.description,
      view_level: 'weekly',
      week_start: currentWeekStartStr,
      status: 'not_started',
      category: task.category,
      estimated_minutes: task.estimated_minutes,
      is_admin_assigned: task.is_admin_assigned,
      is_locked: task.is_locked,
      is_carried_over: true,
      original_task_id: task.id,
      parent_monthly_task_id: task.parent_monthly_task_id,
      carry_forward_count: task.carry_forward_count + 1,
      notes: task.notes,
    })
  }
}
