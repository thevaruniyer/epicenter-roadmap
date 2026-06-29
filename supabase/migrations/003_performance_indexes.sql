-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_student_id ON public.tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_week_start ON public.tasks(week_start);
CREATE INDEX IF NOT EXISTS idx_tasks_day_date ON public.tasks(day_date);
CREATE INDEX IF NOT EXISTS idx_tasks_view_level ON public.tasks(view_level);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_student_view ON public.tasks(student_id, view_level);
CREATE INDEX IF NOT EXISTS idx_tasks_student_week ON public.tasks(student_id, week_start);
CREATE INDEX IF NOT EXISTS idx_tasks_student_day ON public.tasks(student_id, day_date);
CREATE INDEX IF NOT EXISTS idx_tasks_student_month ON public.tasks(student_id, month, year);
CREATE INDEX IF NOT EXISTS idx_tasks_carried_over ON public.tasks(student_id, is_carried_over, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_student_week ON public.weekly_reflections(student_id, week_start);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
