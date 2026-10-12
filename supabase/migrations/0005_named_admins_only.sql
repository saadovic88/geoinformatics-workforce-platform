-- Final access boundary: only the three named leaders have platform-wide
-- visibility and editing authority. Everyone else receives their own records
-- (and a manager's direct reports where an operational approval requires it).
create or replace function public.is_privileged()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and email in (
        'm.badawy@geoinformatics.com',
        'amr.soghayar@geoinformatics.com',
        'badr.salama@geoinformatics.com'
      )
  );
$$;

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target_profile_id = auth.uid()
    or public.is_privileged()
    or exists (
      select 1 from public.profiles target
      where target.id = target_profile_id and target.manager_id = auth.uid()
    );
$$;

create or replace function public.is_people_operations()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_privileged();
$$;

create or replace function public.can_view_kpi_for(target_employee_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target_employee_id = auth.uid() or public.is_privileged();
$$;
