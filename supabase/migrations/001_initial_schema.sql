-- profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('admin', 'student')) not null,
  full_name text not null,
  username text unique not null,
  weekly_load_cap integer default 600,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  title text not null,
  description text,
  view_level text check (view_level in ('monthly', 'weekly', 'daily')) not null,
  month integer check (month between 1 and 12),
  year integer,
  week_start date,
  day_date date,
  status text check (status in ('not_started', 'in_progress', 'done', 'blocked')) default 'not_started',
  category text check (category in ('EC', 'SAT Prep', 'Essays', 'Academic', 'Admin', 'Personal')) not null,
  estimated_minutes integer default 30,
  is_admin_assigned boolean default false,
  is_locked boolean default false,
  is_carried_over boolean default false,
  original_task_id uuid references public.tasks(id),
  parent_monthly_task_id uuid references public.tasks(id),
  carry_forward_count integer default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- weekly_reflections table
create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  week_start date not null,
  content text,
  mood text check (mood in ('great', 'good', 'okay', 'tough')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, week_start)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.weekly_reflections enable row level security;

-- Profiles RLS policies
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can update all profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can insert profiles" on public.profiles
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete profiles" on public.profiles
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Tasks RLS policies
create policy "Students can view their own tasks" on public.tasks
  for select using (student_id = auth.uid());

create policy "Admins can view all tasks" on public.tasks
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Students can insert their own tasks" on public.tasks
  for insert with check (
    student_id = auth.uid() and is_admin_assigned = false
  );

create policy "Admins can insert tasks" on public.tasks
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Students can update their own unlocked tasks" on public.tasks
  for update using (
    student_id = auth.uid() and is_locked = false
  );

create policy "Admins can update all tasks" on public.tasks
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete tasks" on public.tasks
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Students can delete their own non-admin tasks" on public.tasks
  for delete using (
    student_id = auth.uid() and is_admin_assigned = false
  );

-- Weekly reflections RLS policies
create policy "Students can view their own reflections" on public.weekly_reflections
  for select using (student_id = auth.uid());

create policy "Admins can view all reflections" on public.weekly_reflections
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Students can insert their own reflections" on public.weekly_reflections
  for insert with check (student_id = auth.uid());

create policy "Students can update their own reflections" on public.weekly_reflections
  for update using (student_id = auth.uid());

create policy "Admins can manage all reflections" on public.weekly_reflections
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger handle_tasks_updated_at before update on public.tasks
  for each row execute function public.handle_updated_at();

create trigger handle_reflections_updated_at before update on public.weekly_reflections
  for each row execute function public.handle_updated_at();
