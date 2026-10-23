-- Retain task conversations and deliver each comment with its notifications.
create or replace function public.add_task_comment(task_document_id text, comment_id text, comment_content text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  task_row public.company_data_documents%rowtype;
  task_data jsonb;
  comment_data jsonb;
  delivery jsonb;
  deliveries jsonb := '[]'::jsonb;
  recipient uuid;
  actor_en text;
  actor_ar text;
  created_at_text text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(comment_id), '') is null or length(comment_id) > 160 or nullif(trim(comment_content), '') is null or length(comment_content) > 4000 then
    raise exception 'A comment of up to 4000 characters is required.';
  end if;
  select * into task_row from public.company_data_documents where kind = 'task' and document_id = task_document_id for update;
  if not found then raise exception 'Task not found.'; end if;
  task_data := task_row.payload;
  if not public.is_privileged() and task_data->>'creatorId' is distinct from actor::text and not (coalesce(task_data->'assigneeIds', '[]'::jsonb) ? actor::text) then
    raise exception 'You are not authorised to comment on this task.';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(task_data->'comments','[]'::jsonb)) c where c->>'id' = comment_id) then
    raise exception 'Comment already exists.';
  end if;
  select name_en, name_ar into actor_en, actor_ar from public.profiles where id = actor and status = 'active';
  if not found then raise exception 'Active employee required.'; end if;
  comment_data := jsonb_build_object('id', comment_id, 'userId', actor::text, 'content', trim(comment_content), 'createdAt', created_at_text);
  task_data := jsonb_set(task_data, '{comments}', coalesce(task_data->'comments','[]'::jsonb) || jsonb_build_array(comment_data), true);
  perform set_config('app.task_comment', 'on', true);
  update public.company_data_documents set payload = task_data where id = task_row.id;
  perform set_config('app.task_comment', 'off', true);
  for recipient in
    select distinct p.id from public.profiles p
    where p.status = 'active' and p.id <> actor and
      (p.id::text = task_data->>'creatorId' or coalesce(task_data->'assigneeIds','[]'::jsonb) ? p.id::text)
  loop
    delivery := jsonb_build_object(
      'id', 'comment_' || md5(comment_id || recipient::text), 'userId', recipient::text,
      'createdBy', actor::text, 'createdAt', created_at_text, 'isRead', false,
      'type', 'task', 'priority', 'medium', 'titleEn', 'New task comment', 'titleAr', 'تعليق جديد على مهمة',
      'messageEn', actor_en || ' commented on “' || coalesce(task_data->>'title','Task') || '”: ' || left(trim(comment_content), 300),
      'messageAr', coalesce(actor_ar, actor_en) || ' أضاف تعليقًا على المهمة «' || coalesce(task_data->>'title','مهمة') || '»: ' || left(trim(comment_content), 300),
      'actionUrl', 'task:' || task_document_id
    );
    insert into public.company_data_documents(kind, document_id, owner_id, payload)
      values ('notification', delivery->>'id', recipient, delivery);
    deliveries := deliveries || jsonb_build_array(delivery);
  end loop;
  return jsonb_build_object('task', task_data, 'notifications', deliveries);
end;
$$;
revoke all on function public.add_task_comment(text,text,text) from public;
grant execute on function public.add_task_comment(text,text,text) to authenticated;

-- Stale clients must never erase previously saved discussion entries.
create or replace function public.retain_task_comments()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.kind = 'task' and new.payload->'comments' is distinct from old.payload->'comments'
    and auth.uid() is not null and coalesce(current_setting('app.task_comment', true), '') <> 'on' then
    raise exception 'Task comments must be added through add_task_comment.';
  end if;
  if old.kind = 'task' and exists (
    select 1 from jsonb_array_elements(coalesce(old.payload->'comments','[]'::jsonb)) old_comment
    where not exists (select 1 from jsonb_array_elements(coalesce(new.payload->'comments','[]'::jsonb)) new_comment where new_comment = old_comment)
  ) then raise exception 'Existing task comments cannot be removed or changed.'; end if;
  return new;
end;
$$;
drop trigger if exists retain_task_comments on public.company_data_documents;
create trigger retain_task_comments before update on public.company_data_documents for each row execute function public.retain_task_comments();
