-- Atomic, append-only task workflow transitions. Apply after 0019.
-- Task rows are never deleted; cancellation is a retained archive state.

create or replace function public.transition_company_task(
  task_document_id text,
  expected_status text,
  next_status text,
  transition_note text default null,
  transition_notifications jsonb default '[]'::jsonb,
  task_review_score numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  row_record public.company_data_documents%rowtype;
  task_payload jsonb;
  transition_id text;
  changed_at text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  allowed boolean := false;
  participant boolean := false;
  item jsonb;
  recipient uuid;
  notification_id text;
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  select * into row_record from public.company_data_documents
    where kind = 'task' and document_id = task_document_id for update;
  if not found then raise exception 'Task not found.'; end if;
  task_payload := row_record.payload;
  if task_payload->>'status' is distinct from expected_status then
    raise exception 'Task stage changed on another device. Refresh and try again.';
  end if;

  participant := task_payload->>'creatorId' = actor::text
    or coalesce(task_payload->'assigneeIds', '[]'::jsonb) ? actor::text;
  if not public.is_privileged() and not participant then raise exception 'You are not authorised to update this task.'; end if;

  allowed := case expected_status
    when 'not_started' then next_status in ('in_progress','cancelled')
    when 'in_progress' then next_status in ('blocked','submitted','cancelled')
    when 'blocked' then next_status in ('in_progress','cancelled')
    when 'submitted' then next_status in ('completed','needs_revision','cancelled')
    when 'needs_revision' then next_status in ('in_progress','submitted','cancelled')
    when 'overdue' then next_status in ('in_progress','blocked','submitted','cancelled')
    when 'completed' then next_status = 'cancelled'
    else false end;
  if not allowed then raise exception 'Invalid task workflow transition.'; end if;
  if next_status in ('completed','needs_revision') and not public.is_privileged() then
    raise exception 'Only an authorised reviewer can record this decision.';
  end if;
  if next_status = 'cancelled' and not public.is_privileged() and task_payload->>'creatorId' <> actor::text then
    raise exception 'Only the task creator or an authorised manager can archive this task.';
  end if;
  if next_status in ('blocked','needs_revision','cancelled') and nullif(trim(transition_note), '') is null then
    raise exception 'A reason is required for this stage.';
  end if;

  select name_en into actor_name from public.profiles where id = actor;
  transition_id := 'stage_' || extract(epoch from clock_timestamp())::bigint::text || '_' || substr(md5(random()::text), 1, 6);
  task_payload := jsonb_set(task_payload, '{status}', to_jsonb(next_status), true);
  task_payload := jsonb_set(task_payload, '{lastStatusChangedAt}', to_jsonb(changed_at), true);
  task_payload := jsonb_set(task_payload, '{stageHistory}', coalesce(task_payload->'stageHistory','[]'::jsonb) || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'id', transition_id, 'from', expected_status, 'to', next_status, 'actorId', actor::text,
    'actorName', coalesce(actor_name, 'Company user'), 'timestamp', changed_at, 'note', nullif(trim(transition_note), '')
  ))), true);
  task_payload := jsonb_set(task_payload, '{activityLogs}', coalesce(task_payload->'activityLogs','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'id', 'act_' || extract(epoch from clock_timestamp())::bigint::text,
    'userId', actor::text, 'action', expected_status || ' -> ' || next_status,
    'timestamp', changed_at
  )), true);
  if next_status = 'completed' then
    task_payload := jsonb_set(task_payload, '{completedAt}', to_jsonb(changed_at), true);
    task_payload := jsonb_set(task_payload, '{progressPercent}', '100'::jsonb, true);
  elsif next_status = 'cancelled' then
    task_payload := jsonb_set(task_payload, '{archivedAt}', to_jsonb(changed_at), true);
  elsif next_status = 'in_progress' and coalesce((task_payload->>'progressPercent')::numeric, 0) < 10 then
    task_payload := jsonb_set(task_payload, '{progressPercent}', '10'::jsonb, true);
  end if;
  if task_review_score is not null then
    if next_status not in ('completed','needs_revision') or not public.is_privileged() or task_review_score < 0 or task_review_score > 100 then
      raise exception 'Invalid task review score.';
    end if;
    task_payload := jsonb_set(task_payload, '{reviewScore}', to_jsonb(task_review_score), true);
    task_payload := jsonb_set(task_payload, '{managerReviewNotes}', to_jsonb(coalesce(transition_note,'')), true);
  end if;

  perform set_config('app.task_transition', 'on', true);
  update public.company_data_documents set payload = task_payload, updated_at = now() where id = row_record.id;

  if jsonb_typeof(coalesce(transition_notifications, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(transition_notifications, '[]'::jsonb)) > 25 then
    raise exception 'Invalid task notification batch.';
  end if;
  for item in select value from jsonb_array_elements(coalesce(transition_notifications,'[]'::jsonb)) loop
    notification_id := nullif(trim(item->>'id'), '');
    recipient := nullif(item->>'userId','')::uuid;
    if notification_id is null or recipient is null
      or item->>'type' is distinct from 'task'
      or item->>'actionUrl' is distinct from 'task:' || task_document_id
      or length(coalesce(item->>'titleEn','')) > 200
      or length(coalesce(item->>'titleAr','')) > 200
      or length(coalesce(item->>'messageEn','')) > 2000
      or length(coalesce(item->>'messageAr','')) > 2000
      or not exists (select 1 from public.profiles p where p.id = recipient and p.status = 'active') then
      raise exception 'Invalid task notification.';
    end if;
    if not (
      recipient::text = task_payload->>'creatorId'
      or coalesce(task_payload->'assigneeIds','[]'::jsonb) ? recipient::text
      or exists (select 1 from public.profiles p where p.id = recipient and p.role_id = 'sys_admin' and p.status = 'active')
    ) then raise exception 'Invalid task notification recipient.'; end if;
    insert into public.company_data_documents(kind, document_id, owner_id, payload)
    values ('notification', notification_id, recipient, jsonb_set(item, '{createdBy}', to_jsonb(actor::text), true));
  end loop;
  return jsonb_build_object(
    'taskId', task_document_id,
    'status', next_status,
    'transitionId', transition_id,
    'task', task_payload
  );
exception when unique_violation then
  raise exception 'A task notification id already exists.';
end;
$$;

revoke all on function public.transition_company_task(text,text,text,text,jsonb,numeric) from public;
grant execute on function public.transition_company_task(text,text,text,text,jsonb,numeric) to authenticated;

-- Direct API updates may change task content, but workflow status and history
-- can only be changed by transition_company_task. Service maintenance remains possible.
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
  if actor is null then return new; end if;
  if old.kind = 'task' and (
    new.payload->>'status' is distinct from old.payload->>'status'
    or new.payload->'stageHistory' is distinct from old.payload->'stageHistory'
    or new.payload->>'completedAt' is distinct from old.payload->>'completedAt'
    or new.payload->>'archivedAt' is distinct from old.payload->>'archivedAt'
  ) and coalesce(current_setting('app.task_transition', true), '') <> 'on' then
    raise exception 'Task workflow stages must use transition_company_task.';
  end if;
  -- The SECURITY DEFINER transition function has already performed role,
  -- participant, current-stage, transition, note, and notification checks.
  -- Do not run the ordinary assignee content allow-list against its atomic
  -- workflow update, because status/history are intentionally changed here.
  if old.kind = 'task' and coalesce(current_setting('app.task_transition', true), '') = 'on' then
    return new;
  end if;
  if public.is_privileged() then return new; end if;
  if old.kind = 'leave_balance' then raise exception 'Employees cannot alter leave balances.'; end if;
  if old.kind = 'leave_request' then
    if old.owner_id = actor then
      if new.payload->'approvalSteps' is distinct from old.payload->'approvalSteps' or new.payload->>'status' is distinct from old.payload->>'status' then raise exception 'Requesters cannot alter approvals or workflow status.'; end if;
      return new;
    end if;
    if new.payload - 'approvalSteps' is distinct from old.payload - 'approvalSteps' then raise exception 'Approvers may update only their own approval step.'; end if;
    select coalesce(jsonb_agg(step order by step->>'approverId'), '[]'::jsonb) into old_other_steps from jsonb_array_elements(coalesce(old.payload->'approvalSteps','[]'::jsonb)) step where step->>'approverId' <> actor::text;
    select coalesce(jsonb_agg(step order by step->>'approverId'), '[]'::jsonb) into new_other_steps from jsonb_array_elements(coalesce(new.payload->'approvalSteps','[]'::jsonb)) step where step->>'approverId' <> actor::text;
    if new_other_steps is distinct from old_other_steps then raise exception 'An approver cannot alter another approver decision.'; end if;
  end if;
  if old.kind = 'task' and old.payload->>'creatorId' <> actor::text then
    if new.payload - array['actualHours','progressPercent','notes','subtasks','attachments','comments','activityLogs'] is distinct from old.payload - array['actualHours','progressPercent','notes','subtasks','attachments','comments','activityLogs'] then
      raise exception 'Assignees cannot alter task ownership, assignment, priority, dates, or review.';
    end if;
  end if;
  return new;
end;
$$;
