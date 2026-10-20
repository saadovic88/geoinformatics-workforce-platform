-- Security hardening for document workflows and private attachments.
-- Apply after 0016.

create or replace function public.guard_company_document_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  old_other_steps jsonb;
  new_other_steps jsonb;
begin
  -- Server-side maintenance has no end-user JWT and remains possible.
  if actor is null or public.is_privileged() then return new; end if;

  if old.kind = 'leave_balance' then
    raise exception 'Employees cannot alter leave balances.';
  end if;

  if old.kind = 'leave_request' then
    if old.owner_id = actor then
      if new.payload->'approvalSteps' is distinct from old.payload->'approvalSteps'
        or new.payload->>'status' is distinct from old.payload->>'status' then
        raise exception 'Requesters cannot alter approvals or workflow status.';
      end if;
      return new;
    end if;

    if new.payload - 'approvalSteps' is distinct from old.payload - 'approvalSteps' then
      raise exception 'Approvers may update only their own approval step.';
    end if;
    select coalesce(jsonb_agg(step order by step->>'approverId'), '[]'::jsonb)
      into old_other_steps from jsonb_array_elements(coalesce(old.payload->'approvalSteps','[]'::jsonb)) step
      where step->>'approverId' <> actor::text;
    select coalesce(jsonb_agg(step order by step->>'approverId'), '[]'::jsonb)
      into new_other_steps from jsonb_array_elements(coalesce(new.payload->'approvalSteps','[]'::jsonb)) step
      where step->>'approverId' <> actor::text;
    if new_other_steps is distinct from old_other_steps then
      raise exception 'An approver cannot alter another approver decision.';
    end if;
  end if;

  if old.kind = 'task' and old.payload->>'creatorId' <> actor::text then
    if new.payload - array['status','actualHours','progressPercent','notes','subtasks','attachments','comments','activityLogs']
       is distinct from
       old.payload - array['status','actualHours','progressPercent','notes','subtasks','attachments','comments','activityLogs'] then
      raise exception 'Assignees cannot alter task ownership, assignment, priority, dates, or review.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists company_document_update_guard on public.company_data_documents;
create trigger company_document_update_guard
before update on public.company_data_documents
for each row execute function public.guard_company_document_update();

-- Notifications are append-only delivery envelopes. A caller cannot take over
-- an existing notification by guessing its document id.
create or replace function public.create_company_notification(notification_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare recipient_id uuid; notification_id text; normalized_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  notification_id := nullif(trim(notification_payload->>'id'), '');
  recipient_id := nullif(notification_payload->>'userId', 'all')::uuid;
  if notification_id is null or recipient_id is null then raise exception 'A recipient and notification id are required.'; end if;
  if not exists (select 1 from public.profiles where id = recipient_id and status = 'active') then raise exception 'Recipient is not active.'; end if;
  if length(coalesce(notification_payload->>'titleEn','')) > 200 or length(coalesce(notification_payload->>'messageEn','')) > 2000 then raise exception 'Notification is too long.'; end if;
  normalized_payload := jsonb_set(notification_payload, '{createdBy}', to_jsonb(auth.uid()::text), true);
  insert into public.company_data_documents(kind, document_id, owner_id, payload)
  values ('notification', notification_id, recipient_id, normalized_payload);
exception when unique_violation then
  raise exception 'Notification id already exists.';
end;
$$;
revoke all on function public.create_company_notification(jsonb) from public;
grant execute on function public.create_company_notification(jsonb) to authenticated;

-- Atomic task creation is insert-only. Reusing a guessed task/notification id
-- cannot overwrite a record created by another employee.
create or replace function public.create_company_task_delivery(
  task_payload jsonb,
  notification_payloads jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare task_id text; item jsonb; recipient_id uuid; notification_id text; normalized_notification jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if task_payload->>'creatorId' <> auth.uid()::text or not public.can_create_team_task(task_payload) then raise exception 'You are not authorised to assign this task.'; end if;
  task_id := nullif(trim(task_payload->>'id'), '');
  if task_id is null or jsonb_array_length(coalesce(task_payload->'assigneeIds','[]'::jsonb)) = 0 then raise exception 'A task id and at least one assignee are required.'; end if;
  if exists (
    select 1 from jsonb_array_elements_text(task_payload->'assigneeIds') assignee(id)
    where not exists (select 1 from public.profiles p where p.id = assignee.id::uuid and p.status = 'active')
  ) then raise exception 'Every assignee must be an active employee.'; end if;
  insert into public.company_data_documents(kind, document_id, owner_id, payload)
  values ('task', task_id, auth.uid(), task_payload);
  for item in select value from jsonb_array_elements(coalesce(notification_payloads,'[]'::jsonb)) loop
    notification_id := nullif(trim(item->>'id'), ''); recipient_id := (item->>'userId')::uuid;
    if notification_id is null or recipient_id is null or not (task_payload->'assigneeIds' ? recipient_id::text) then raise exception 'Invalid task notification recipient.'; end if;
    normalized_notification := jsonb_set(item, '{createdBy}', to_jsonb(auth.uid()::text), true);
    insert into public.company_data_documents(kind, document_id, owner_id, payload)
    values ('notification', notification_id, recipient_id, normalized_notification);
  end loop;
  return jsonb_build_object('taskId', task_id, 'deliveredTo', jsonb_array_length(coalesce(notification_payloads,'[]'::jsonb)));
exception when unique_violation then
  raise exception 'Task or notification id already exists.';
end;
$$;
revoke all on function public.create_company_task_delivery(jsonb, jsonb) from public;
grant execute on function public.create_company_task_delivery(jsonb, jsonb) to authenticated;

-- Attachments contain private company data. Directory avatars used by this app
-- are bundled public assets; bucket files remain visible to their owner only.
drop policy if exists "authenticated read files" on storage.objects;
drop policy if exists "users read own files" on storage.objects;
create policy "users read own files" on storage.objects
for select to authenticated
using (
  bucket_id in ('task-attachments','leave-attachments','avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
);
