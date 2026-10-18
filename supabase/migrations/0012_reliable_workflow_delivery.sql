-- Reliable cross-device delivery for leave requests, tasks, and notifications.
-- This keeps profile data private while letting the workflow resolve the
-- required signers server-side.

create or replace function public.get_leave_approvers_for_current_user()
returns table (id uuid, name_en text)
language sql
stable
security definer
set search_path = public
as $$
  with requester as (
    select department_id from public.profiles where id = auth.uid()
  ), required_roles as (
    select unnest(array[
      'ceo',
      'admin_manager',
      'tech_manager',
      case (select department_id from requester)
        when 'training' then 'training_manager'
        when 'gis' then 'gis_manager'
        when 'remote_sensing' then 'rs_manager'
        when 'administrative' then 'admin_manager'
        when 'technical' then 'tech_manager'
        else null
      end
    ]::text[]) as role_id
  )
  select distinct on (p.id) p.id, p.name_en
  from public.profiles p
  join required_roles r on r.role_id = p.role_id
  where p.status = 'active' and p.id <> auth.uid()
  order by p.id, p.name_en;
$$;

revoke all on function public.get_leave_approvers_for_current_user() from public;
grant execute on function public.get_leave_approvers_for_current_user() to authenticated;

-- A notification is a non-sensitive delivery envelope. Any authenticated
-- workflow participant may create one for another employee, while only the
-- recipient (or a named administrator) can later update/read it.
drop policy if exists "company documents scoped insert" on public.company_data_documents;
create policy "company documents scoped insert" on public.company_data_documents
for insert to authenticated
with check (
  public.is_privileged()
  or (
    kind = 'notification'
    and owner_id is not null
    and owner_id = (payload->>'userId')::uuid
  )
  or (
    owner_id = auth.uid()
    and kind in ('attendance', 'leave_request', 'leave_balance', 'notification')
  )
  or (
    kind = 'task'
    and (payload->>'creatorId' = auth.uid()::text or coalesce(payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text)
  )
);

-- A routed leave signer must be able to save their own decision. The existing
-- access function already limits reads to the owner or listed signers.
drop policy if exists "company documents scoped update" on public.company_data_documents;
create policy "company documents scoped update" on public.company_data_documents
for update to authenticated
using (public.can_access_company_document(kind, owner_id, payload))
with check (
  public.is_privileged()
  or (
    kind = 'leave_request'
    and jsonb_path_exists(
      payload,
      '$.approvalSteps[*] ? (@.approverId == $viewer)',
      jsonb_build_object('viewer', to_jsonb(auth.uid()::text))
    )
  )
  or (
    owner_id = auth.uid()
    and kind in ('attendance', 'leave_request', 'leave_balance', 'notification')
  )
  or (
    kind = 'task'
    and (payload->>'creatorId' = auth.uid()::text or coalesce(payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text)
  )
);
