-- Atomic workflow delivery. A task and every assignee notification are written
-- in one database transaction so partial browser/network failures cannot leave
-- a task appearing sent while the employee receives nothing.

create or replace function public.create_company_notification(notification_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  notification_id text;
  normalized_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  notification_id := notification_payload->>'id';
  recipient_id := nullif(notification_payload->>'userId', 'all')::uuid;
  if notification_id is null or recipient_id is null then
    raise exception 'A recipient and notification id are required.';
  end if;

  normalized_payload := jsonb_set(notification_payload, '{createdBy}', to_jsonb(auth.uid()::text), true);
  insert into public.company_data_documents (kind, document_id, owner_id, payload)
  values ('notification', notification_id, recipient_id, normalized_payload)
  on conflict (kind, document_id) do update
  set owner_id = excluded.owner_id, payload = excluded.payload, updated_at = now();
end;
$$;

revoke all on function public.create_company_notification(jsonb) from public;
grant execute on function public.create_company_notification(jsonb) to authenticated;

create or replace function public.create_company_task_delivery(
  task_payload jsonb,
  notification_payloads jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  task_id text;
  item jsonb;
  recipient_id uuid;
  notification_id text;
  normalized_notification jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if task_payload->>'creatorId' <> auth.uid()::text or not public.can_create_team_task(task_payload) then
    raise exception 'You are not authorised to assign this task.';
  end if;

  task_id := task_payload->>'id';
  if task_id is null or jsonb_array_length(coalesce(task_payload->'assigneeIds', '[]'::jsonb)) = 0 then
    raise exception 'A task id and at least one assignee are required.';
  end if;

  insert into public.company_data_documents (kind, document_id, owner_id, payload)
  values ('task', task_id, auth.uid(), task_payload)
  on conflict (kind, document_id) do update
  set owner_id = excluded.owner_id, payload = excluded.payload, updated_at = now();

  for item in select value from jsonb_array_elements(coalesce(notification_payloads, '[]'::jsonb)) loop
    notification_id := item->>'id';
    recipient_id := (item->>'userId')::uuid;
    if notification_id is null or recipient_id is null
      or not (coalesce(task_payload->'assigneeIds', '[]'::jsonb) ? recipient_id::text) then
      raise exception 'Invalid task notification recipient.';
    end if;
    normalized_notification := jsonb_set(item, '{createdBy}', to_jsonb(auth.uid()::text), true);
    insert into public.company_data_documents (kind, document_id, owner_id, payload)
    values ('notification', notification_id, recipient_id, normalized_notification)
    on conflict (kind, document_id) do update
    set owner_id = excluded.owner_id, payload = excluded.payload, updated_at = now();
  end loop;

  return jsonb_build_object('taskId', task_id, 'deliveredTo', jsonb_array_length(coalesce(notification_payloads, '[]'::jsonb)));
end;
$$;

revoke all on function public.create_company_task_delivery(jsonb, jsonb) from public;
grant execute on function public.create_company_task_delivery(jsonb, jsonb) to authenticated;
