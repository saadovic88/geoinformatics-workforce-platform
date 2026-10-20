-- Mohamed Omar and Dr. Ghada are monitoring-only observers.
-- They cannot be assigned operational tasks. Normalize Amr's display name.

update public.profiles
set name_en = 'Mr. Amr Elsagher', updated_at = now()
where email = 'amr.soghayar@geoinformatics.com';

update auth.users
set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{name_en}', '"Mr. Amr Elsagher"'::jsonb, true)
where email = 'amr.soghayar@geoinformatics.com';

-- Retain every task, but remove observer assignments. Migration 0014 records
-- the previous document version for audit and recovery.
update public.company_data_documents d
set payload = jsonb_set(
  d.payload,
  '{assigneeIds}',
  coalesce((
    select jsonb_agg(to_jsonb(assignee_id))
    from jsonb_array_elements_text(coalesce(d.payload->'assigneeIds','[]'::jsonb)) assignee(assignee_id)
    where not exists (
      select 1 from public.profiles p
      where p.id::text = assignee.assignee_id and p.role_id = 'co_founder'
    )
  ), '[]'::jsonb),
  true
)
where d.kind = 'task'
  and exists (
    select 1
    from jsonb_array_elements_text(coalesce(d.payload->'assigneeIds','[]'::jsonb)) assignee(assignee_id)
    join public.profiles p on p.id::text = assignee.assignee_id
    where p.role_id = 'co_founder'
  );

delete from public.task_assignees ta
using public.profiles p
where ta.employee_id = p.id and p.role_id = 'co_founder';

create or replace function public.prevent_observer_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where id = new.employee_id and role_id = 'co_founder') then
    raise exception 'Monitoring-only observers cannot be assigned operational tasks.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_observer_task_assignment on public.task_assignees;
create trigger prevent_observer_task_assignment
before insert or update on public.task_assignees
for each row execute function public.prevent_observer_task_assignment();

create or replace function public.can_create_team_task(task_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    jsonb_array_length(coalesce(task_payload->'assigneeIds','[]'::jsonb)) > 0
    and not exists (
      select 1
      from jsonb_array_elements_text(coalesce(task_payload->'assigneeIds','[]'::jsonb)) assignee(id)
      where not exists (
        select 1 from public.profiles member
        where member.id = assignee.id::uuid
          and member.status = 'active'
          and member.role_id <> 'co_founder'
          and (public.is_privileged() or member.manager_id = auth.uid())
      )
    );
$$;
