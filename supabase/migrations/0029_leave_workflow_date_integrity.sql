-- Authoritative leave decisions and Cairo-calendar validation.
-- This migration retains every request; it never deletes leave, approval, or balance data.

create or replace function public.validate_company_leave_document()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  start_text text;
  end_text text;
  leave_type text;
  duration numeric;
begin
  if new.kind = 'task' then
    start_text := new.payload->>'startDate';
    end_text := new.payload->>'dueDate';
    if start_text !~ '^\d{4}-\d{2}-\d{2}$' or end_text !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Task dates must use YYYY-MM-DD.';
    end if;
    if end_text::date < start_text::date then
      raise exception 'Task due date cannot be before the start date.';
    end if;
    return new;
  end if;
  if new.kind <> 'leave_request' then return new; end if;
  start_text := new.payload->>'startDate';
  end_text := new.payload->>'endDate';
  leave_type := new.payload->>'leaveType';
  if start_text !~ '^\d{4}-\d{2}-\d{2}$' or end_text !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Leave dates must use YYYY-MM-DD.';
  end if;
  if end_text::date < start_text::date then
    raise exception 'Leave end date cannot be before the start date.';
  end if;
  if coalesce(new.payload->>'durationUnits', '') !~ '^\d+(\.\d+)?$' then
    raise exception 'Leave duration must be a positive number.';
  end if;
  duration := (new.payload->>'durationUnits')::numeric;
  if duration <= 0 then raise exception 'Leave duration must be positive.'; end if;
  if leave_type in ('late_arrival', 'early_leave', 'short_hourly') and start_text <> end_text then
    raise exception 'Hourly permissions must start and end on the same date.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_company_leave_document on public.company_data_documents;
create trigger validate_company_leave_document
before insert or update on public.company_data_documents
for each row execute function public.validate_company_leave_document();

-- Keep the existing document guard, but allow the atomic leave RPC below to
-- change the request, its ledger, and its notification in one transaction.
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
  if actor is null or public.is_privileged() then return new; end if;
  if coalesce(current_setting('app.leave_transition', true), '') = 'on'
    and old.kind in ('leave_request', 'leave_balance') then return new; end if;

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
      into old_other_steps
      from jsonb_array_elements(coalesce(old.payload->'approvalSteps', '[]'::jsonb)) step
      where step->>'approverId' <> actor::text;
    select coalesce(jsonb_agg(step order by step->>'approverId'), '[]'::jsonb)
      into new_other_steps
      from jsonb_array_elements(coalesce(new.payload->'approvalSteps', '[]'::jsonb)) step
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

create or replace function public.transition_company_leave(
  request_document_id text,
  next_decision text,
  decision_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  request_row public.company_data_documents%rowtype;
  balance_row public.company_data_documents%rowtype;
  request_payload jsonb;
  next_steps jsonb;
  next_status text;
  balance_payload jsonb;
  notification_payload jsonb;
  changed_at text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  duration numeric;
  was_approved boolean;
  is_approved boolean;
  was_rejected boolean;
  is_rejected boolean;
  employee_name text;
  actor_name text;
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  if next_decision not in ('approved', 'rejected') then raise exception 'Invalid leave decision.'; end if;

  select * into request_row
  from public.company_data_documents
  where kind = 'leave_request' and document_id = request_document_id
  for update;
  if not found then raise exception 'Leave request not found.'; end if;
  request_payload := request_row.payload;

  if jsonb_typeof(coalesce(request_payload->'approvalSteps', 'null'::jsonb)) <> 'array'
    or jsonb_array_length(request_payload->'approvalSteps') = 0 then
    raise exception 'The leave request has no approval route.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(request_payload->'approvalSteps') step
    where step->>'approverId' = actor::text
  ) then
    raise exception 'You are not assigned to approve this leave request.';
  end if;

  select jsonb_agg(
    case when step->>'approverId' = actor::text
      then step || jsonb_build_object(
        'status', next_decision,
        'actionDate', changed_at,
        'notes', nullif(trim(decision_note), '')
      )
      else step
    end
    order by ordinal
  )
  into next_steps
  from jsonb_array_elements(request_payload->'approvalSteps') with ordinality as item(step, ordinal);

  if not exists (select 1 from jsonb_array_elements(next_steps) step where step->>'status' <> 'approved') then
    next_status := 'approved';
  elsif exists (select 1 from jsonb_array_elements(next_steps) step where step->>'status' = 'rejected') then
    next_status := 'rejected';
  elsif exists (select 1 from jsonb_array_elements(next_steps) step where step->>'status' = 'approved') then
    next_status := 'partially_approved';
  else
    next_status := 'pending_approval';
  end if;

  was_approved := request_payload->>'status' = 'approved';
  is_approved := next_status = 'approved';
  was_rejected := request_payload->>'status' = 'rejected';
  is_rejected := next_status = 'rejected';
  duration := coalesce((request_payload->>'durationUnits')::numeric, 0);
  request_payload := jsonb_set(
    jsonb_set(request_payload, '{approvalSteps}', next_steps, true),
    '{status}', to_jsonb(next_status), true
  );

  perform set_config('app.leave_transition', 'on', true);
  update public.company_data_documents
    set payload = request_payload
    where id = request_row.id;

  select * into balance_row
  from public.company_data_documents
  where kind = 'leave_balance'
    and owner_id = request_row.owner_id
    and payload->>'leaveType' = request_payload->>'leaveType'
  for update;

  if found and (was_approved <> is_approved or was_rejected <> is_rejected) then
    balance_payload := balance_row.payload;
    if not was_approved and is_approved then
      balance_payload := jsonb_set(balance_payload, '{pending}', to_jsonb(greatest(0::numeric, coalesce((balance_payload->>'pending')::numeric, 0) - duration)), true);
      balance_payload := jsonb_set(balance_payload, '{used}', to_jsonb(coalesce((balance_payload->>'used')::numeric, 0) + duration), true);
      balance_payload := jsonb_set(balance_payload, '{remaining}', to_jsonb(greatest(0::numeric, coalesce((balance_payload->>'remaining')::numeric, 0) - duration)), true);
    elsif was_approved and not is_approved then
      balance_payload := jsonb_set(balance_payload, '{used}', to_jsonb(greatest(0::numeric, coalesce((balance_payload->>'used')::numeric, 0) - duration)), true);
      balance_payload := jsonb_set(balance_payload, '{remaining}', to_jsonb(coalesce((balance_payload->>'remaining')::numeric, 0) + duration), true);
      if not is_rejected then
        balance_payload := jsonb_set(balance_payload, '{pending}', to_jsonb(coalesce((balance_payload->>'pending')::numeric, 0) + duration), true);
      end if;
    elsif not was_rejected and is_rejected then
      balance_payload := jsonb_set(balance_payload, '{pending}', to_jsonb(greatest(0::numeric, coalesce((balance_payload->>'pending')::numeric, 0) - duration)), true);
    elsif was_rejected and not is_rejected then
      balance_payload := jsonb_set(balance_payload, '{pending}', to_jsonb(coalesce((balance_payload->>'pending')::numeric, 0) + duration), true);
    end if;
    update public.company_data_documents set payload = balance_payload where id = balance_row.id;
  end if;
  perform set_config('app.leave_transition', 'off', true);

  select name_en into employee_name from public.profiles where id = request_row.owner_id;
  select name_en into actor_name from public.profiles where id = actor;
  notification_payload := jsonb_build_object(
    'id', 'leave_' || md5(request_document_id || actor::text || changed_at),
    'userId', request_row.owner_id::text,
    'createdBy', actor::text,
    'createdAt', changed_at,
    'isRead', false,
    'type', 'leave',
    'priority', 'high',
    'titleEn', case when next_status = 'approved' then 'Leave request fully approved' when next_status = 'rejected' then 'Leave request rejected' else 'Leave approval updated' end,
    'titleAr', case when next_status = 'approved' then 'تم اعتماد طلب الإجازة نهائيًا' when next_status = 'rejected' then 'تم رفض طلب الإجازة' else 'تم تحديث قرار اعتماد الإجازة' end,
    'messageEn', coalesce(actor_name, 'An approver') || ' recorded ' || next_decision || '. Current status: ' || next_status || '.',
    'messageAr', 'تم تسجيل قرار ' || case when next_decision = 'approved' then 'الموافقة' else 'الرفض' end || ' على طلب الإجازة. الحالة الحالية: ' || next_status || '.',
    'actionUrl', 'leave:' || request_document_id
  );
  insert into public.company_data_documents(kind, document_id, owner_id, payload)
    values ('notification', notification_payload->>'id', request_row.owner_id, notification_payload);

  return jsonb_build_object(
    'request', request_payload,
    'balance', balance_payload,
    'notification', notification_payload,
    'employeeName', employee_name
  );
end;
$$;

revoke all on function public.transition_company_leave(text, text, text) from public;
grant execute on function public.transition_company_leave(text, text, text) to authenticated;
