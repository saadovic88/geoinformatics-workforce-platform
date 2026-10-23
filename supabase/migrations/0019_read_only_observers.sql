-- Give the two co-founders company-wide monitoring access without granting
-- create, update, delete, approval, or task-assignment authority.

create or replace function public.is_read_only_observer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and email in ('m.omar@geoinformatics.com', 'dr.ghada@geoinformatics.com')
  );
$$;

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id = auth.uid()
    or public.is_privileged()
    or public.is_read_only_observer()
    or exists (
      select 1 from public.profiles target
      where target.id = target_profile_id and target.manager_id = auth.uid()
    );
$$;

create or replace function public.can_access_company_document(
  record_kind text,
  record_owner uuid,
  record_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_privileged()
    or public.is_read_only_observer()
    or record_kind in ('zone', 'schedule', 'holiday')
    or record_owner = auth.uid()
    or (
      record_kind = 'task'
      and (
        record_payload->>'creatorId' = auth.uid()::text
        or coalesce(record_payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text
      )
    )
    or (
      record_kind = 'leave_request'
      and jsonb_path_exists(
        record_payload,
        '$.approvalSteps[*] ? (@.approverId == $viewer)',
        jsonb_build_object('viewer', to_jsonb(auth.uid()::text))
      )
    );
$$;

revoke all on function public.is_read_only_observer() from public;
grant execute on function public.is_read_only_observer() to authenticated;
