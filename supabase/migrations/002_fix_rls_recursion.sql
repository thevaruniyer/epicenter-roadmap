-- Fix: infinite recursion in RLS policies.
-- The original admin policies used EXISTS (SELECT FROM profiles) which triggered
-- the same policies recursively. Replace with a security definer function that
-- queries profiles as superuser (bypassing RLS).

-- ── Security definer helper ──────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ── Profiles ─────────────────────────────────────────────────────────────────

drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;

create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can update all profiles" on public.profiles
  for update using (public.is_admin());

create policy "Admins can insert profiles" on public.profiles
  for insert with check (public.is_admin());

create policy "Admins can delete profiles" on public.profiles
  for delete using (public.is_admin());

-- ── Tasks ─────────────────────────────────────────────────────────────────────

drop policy if exists "Admins can view all tasks" on public.tasks;
drop policy if exists "Admins can insert tasks" on public.tasks;
drop policy if exists "Admins can update all tasks" on public.tasks;
drop policy if exists "Admins can delete tasks" on public.tasks;

create policy "Admins can view all tasks" on public.tasks
  for select using (public.is_admin());

create policy "Admins can insert tasks" on public.tasks
  for insert with check (public.is_admin());

create policy "Admins can update all tasks" on public.tasks
  for update using (public.is_admin());

create policy "Admins can delete tasks" on public.tasks
  for delete using (public.is_admin());

-- ── Weekly reflections ────────────────────────────────────────────────────────

drop policy if exists "Admins can view all reflections" on public.weekly_reflections;
drop policy if exists "Admins can manage all reflections" on public.weekly_reflections;

create policy "Admins can view all reflections" on public.weekly_reflections
  for select using (public.is_admin());

create policy "Admins can manage all reflections" on public.weekly_reflections
  for all using (public.is_admin());
