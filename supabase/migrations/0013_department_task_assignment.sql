-- Department heads can create tasks for direct reports only. The three named
-- company leaders remain the only users allowed to assign across departments.

create or replace function public.can_create_team_task(task_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_privileged()
    or (
      task_payload->>'creatorId' = auth.uid()::text
      and jsonb_array_length(coalesce(task_payload->'assigneeIds', '[]'::jsonb)) > 0
      and not exists (
        select 1
        from jsonb_array_elements_text(coalesce(task_payload->'assigneeIds', '[]'::jsonb)) as assignee(id)
        where not exists (
          select 1
          from public.profiles team_member
          where team_member.id = assignee.id::uuid
            and team_member.manager_id = auth.uid()
            and team_member.status = 'active'
        )
      )
    );
$$;

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
    and public.can_create_team_task(payload)
  )
);
