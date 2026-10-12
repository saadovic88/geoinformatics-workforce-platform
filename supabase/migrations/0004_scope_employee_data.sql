-- Privacy-first access scope. Run after 0003 in the Supabase SQL Editor.
-- Regular employees can only load their own profile. Managers can load direct
-- reports; executive, HR and administration roles can access the people data
-- required for their operational work.

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_profile_id = auth.uid()
    or public.is_privileged()
    or exists (
      select 1 from public.profiles actor
      where actor.id = auth.uid()
        and actor.role_id in ('ceo', 'co_founder', 'admin_manager', 'hr_officer')
    )
    or exists (
      select 1 from public.profiles target
      where target.id = target_profile_id
        and target.manager_id = auth.uid()
    );
$$;

drop policy if exists "authenticated read directory" on public.profiles;
create policy "profiles scoped read" on public.profiles
for select to authenticated
using (public.can_view_profile(id));

-- HR and administration may review workforce attendance and leave balances.
-- All other employee access remains limited to the existing self/direct-manager
-- policies from the initial migration.
create or replace function public.is_people_operations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_privileged()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role_id in ('admin_manager', 'hr_officer')
    );
$$;

drop policy if exists "attendance people operations read" on public.attendance_records;
create policy "attendance people operations read" on public.attendance_records
for select to authenticated using (public.is_people_operations());

drop policy if exists "balances people operations read" on public.leave_balances;
create policy "balances people operations read" on public.leave_balances
for select to authenticated using (public.is_people_operations());

drop policy if exists "leaves people operations read" on public.leave_requests;
create policy "leaves people operations read" on public.leave_requests
for select to authenticated using (public.is_people_operations());
