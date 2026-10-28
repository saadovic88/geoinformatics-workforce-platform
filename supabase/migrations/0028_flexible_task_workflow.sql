-- A task may be returned to an earlier delivery stage without losing its
-- audit trail. The creator/manager is notified of every assignee update;
-- review and completion remain a manager decision.
create or replace function public.transition_company_task(
  task_document_id text,
  expected_status text,
  next_status text,
  transition_note text default null,
  transition_notifications jsonb default '[]'::jsonb,
  task_review_score numeric default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid(); actor_name text; row_record public.company_data_documents%rowtype;
  task_payload jsonb; transition_id text; changed_at text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  participant boolean; manager boolean; allowed boolean; is_return boolean; item jsonb; recipient uuid; notification_id text;
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  select * into row_record from public.company_data_documents where kind = 'task' and document_id = task_document_id for update;
  if not found then raise exception 'Task not found.'; end if;
  task_payload := row_record.payload;
  if task_payload->>'status' is distinct from expected_status then raise exception 'Task stage changed on another device. Refresh and try again.'; end if;
  participant := task_payload->>'creatorId' = actor::text or coalesce(task_payload->'assigneeIds', '[]'::jsonb) ? actor::text;
  manager := public.is_privileged() or task_payload->>'creatorId' = actor::text;
  if not public.is_privileged() and not participant then raise exception 'You are not authorised to update this task.'; end if;
  allowed := case expected_status
    when 'not_started' then next_status in ('in_progress','blocked','cancelled')
    when 'in_progress' then next_status in ('not_started','blocked','submitted','cancelled')
    when 'blocked' then next_status in ('not_started','in_progress','cancelled')
    when 'submitted' then next_status in ('in_progress','needs_revision','completed','cancelled')
    when 'needs_revision' then next_status in ('not_started','in_progress','blocked','submitted','cancelled')
    when 'overdue' then next_status in ('not_started','in_progress','blocked','submitted','cancelled')
    when 'completed' then next_status in ('submitted','needs_revision','cancelled')
    else false end;
  if not allowed then raise exception 'Invalid task workflow transition.'; end if;
  if next_status in ('completed','needs_revision') and not manager then raise exception 'Only the task manager can record this decision.'; end if;
  if next_status = 'cancelled' and not manager then raise exception 'Only the task manager can archive this task.'; end if;
  is_return := (expected_status, next_status) in (('in_progress','not_started'),('blocked','not_started'),('submitted','in_progress'),('needs_revision','not_started'),('needs_revision','in_progress'),('completed','submitted'),('completed','needs_revision'),('overdue','not_started'),('overdue','in_progress'));
  if (next_status in ('blocked','needs_revision','cancelled') or is_return) and nullif(trim(transition_note), '') is null then raise exception 'A reason is required when returning, blocking, revising, or archiving a task.'; end if;
  if task_review_score is not null and (not manager or next_status not in ('completed','needs_revision') or task_review_score < 0 or task_review_score > 100) then raise exception 'Invalid task review score.'; end if;
  if jsonb_typeof(coalesce(transition_notifications, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(transition_notifications, '[]'::jsonb)) > 25 then raise exception 'Invalid task notification batch.'; end if;
  select name_en into actor_name from public.profiles where id = actor;
  transition_id := 'stage_' || extract(epoch from clock_timestamp())::bigint::text || '_' || substr(md5(random()::text), 1, 6);
  task_payload := jsonb_set(task_payload, '{status}', to_jsonb(next_status), true);
  task_payload := jsonb_set(task_payload, '{lastStatusChangedAt}', to_jsonb(changed_at), true);
  task_payload := jsonb_set(task_payload, '{stageHistory}', coalesce(task_payload->'stageHistory','[]'::jsonb) || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('id', transition_id, 'from', expected_status, 'to', next_status, 'actorId', actor::text, 'actorName', coalesce(actor_name, 'Company user'), 'timestamp', changed_at, 'note', nullif(trim(transition_note), '')))), true);
  task_payload := jsonb_set(task_payload, '{activityLogs}', coalesce(task_payload->'activityLogs','[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', 'act_' || extract(epoch from clock_timestamp())::bigint::text, 'userId', actor::text, 'action', expected_status || ' -> ' || next_status, 'timestamp', changed_at)), true);
  if next_status = 'completed' then task_payload := jsonb_set(jsonb_set(task_payload, '{completedAt}', to_jsonb(changed_at), true), '{progressPercent}', '100'::jsonb, true);
  elsif expected_status = 'completed' then task_payload := jsonb_set(jsonb_set(task_payload, '{reopenedAt}', to_jsonb(changed_at), true), '{progressPercent}', '90'::jsonb, true);
  elsif next_status = 'in_progress' and coalesce((task_payload->>'progressPercent')::numeric, 0) < 10 then task_payload := jsonb_set(task_payload, '{progressPercent}', '10'::jsonb, true); end if;
  if next_status = 'cancelled' then task_payload := jsonb_set(task_payload, '{archivedAt}', to_jsonb(changed_at), true); end if;
  if task_review_score is not null then task_payload := jsonb_set(jsonb_set(task_payload, '{reviewScore}', to_jsonb(task_review_score), true), '{managerReviewNotes}', to_jsonb(coalesce(transition_note,'')), true); end if;
  perform set_config('app.task_transition', 'on', true);
  update public.company_data_documents set payload = task_payload, updated_at = now() where id = row_record.id;
  for item in select value from jsonb_array_elements(coalesce(transition_notifications,'[]'::jsonb)) loop
    notification_id := nullif(trim(item->>'id'), ''); recipient := nullif(item->>'userId','')::uuid;
    if notification_id is null or recipient is null or item->>'type' is distinct from 'task' or item->>'actionUrl' is distinct from 'task:' || task_document_id or length(coalesce(item->>'titleEn','')) > 200 or length(coalesce(item->>'titleAr','')) > 200 or length(coalesce(item->>'messageEn','')) > 2000 or length(coalesce(item->>'messageAr','')) > 2000 or not exists (select 1 from public.profiles p where p.id = recipient and p.status = 'active') then raise exception 'Invalid task notification.'; end if;
    if not (recipient::text = task_payload->>'creatorId' or coalesce(task_payload->'assigneeIds','[]'::jsonb) ? recipient::text or exists (select 1 from public.profiles p where p.id = recipient and p.role_id = 'sys_admin' and p.status = 'active')) then raise exception 'Invalid task notification recipient.'; end if;
    insert into public.company_data_documents(kind, document_id, owner_id, payload) values ('notification', notification_id, recipient, jsonb_set(item, '{createdBy}', to_jsonb(actor::text), true));
  end loop;
  return jsonb_build_object('taskId', task_document_id, 'status', next_status, 'transitionId', transition_id, 'task', task_payload);
exception when unique_violation then raise exception 'Task or notification id already exists.';
end;
$$;
revoke all on function public.transition_company_task(text,text,text,text,jsonb,numeric) from public;
grant execute on function public.transition_company_task(text,text,text,text,jsonb,numeric) to authenticated;
