-- Small, private files sent with tasks. Files never receive a public URL.
-- Apply after 0022.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-attachments', 'task-attachments', false, 5242880,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users read own files" on storage.objects;
drop policy if exists "task attachment participants can read" on storage.objects;
drop policy if exists "task attachment owners can upload" on storage.objects;
drop policy if exists "task attachment owners can delete unlinked files" on storage.objects;

-- A file is readable only after its path is recorded in a task the caller is
-- permitted to see. This also allows company administrators to review it.
create policy "task attachment participants can read" on storage.objects
for select to authenticated using (
  bucket_id = 'task-attachments' and exists (
    select 1 from public.company_data_documents task
    where task.kind = 'task'
      and (
        public.is_privileged()
        or task.payload->>'creatorId' = auth.uid()::text
        or coalesce(task.payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text
      )
      and exists (
        select 1 from jsonb_array_elements(coalesce(task.payload->'attachments', '[]'::jsonb)) attachment
        where attachment->>'storagePath' = storage.objects.name
      )
  )
);

-- Files are first placed beneath the uploader's UUID. The database function
-- below verifies this exact convention before linking it to a task.
create policy "task attachment owners can upload" on storage.objects
for insert to authenticated with check (
  bucket_id = 'task-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "task attachment owners can delete unlinked files" on storage.objects
for delete to authenticated using (
  bucket_id = 'task-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.add_company_task_attachment(task_document_id text, attachment_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare
  actor uuid := auth.uid();
  task_row public.company_data_documents%rowtype;
  task_data jsonb;
  item jsonb := attachment_payload;
  object_path text := nullif(trim(attachment_payload->>'storagePath'), '');
  attachment_id text := nullif(trim(attachment_payload->>'id'), '');
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  if attachment_id is null or length(attachment_id) > 180
    or nullif(trim(attachment_payload->>'name'), '') is null
    or length(attachment_payload->>'name') > 255 then
    raise exception 'A valid attachment id and file name are required.';
  end if;
  if attachment_payload->>'fileType' not in ('image', 'document', 'presentation', 'spreadsheet', 'link') then
    raise exception 'Unsupported attachment type.';
  end if;

  select * into task_row from public.company_data_documents
    where kind = 'task' and document_id = task_document_id for update;
  if not found then raise exception 'Task not found.'; end if;
  task_data := task_row.payload;
  if not public.is_privileged()
    and task_data->>'creatorId' is distinct from actor::text
    and not (coalesce(task_data->'assigneeIds', '[]'::jsonb) ? actor::text) then
    raise exception 'You are not authorised to attach a file to this task.';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(task_data->'attachments', '[]'::jsonb)) old where old->>'id' = attachment_id) then
    raise exception 'Attachment id already exists.';
  end if;

  if attachment_payload->>'fileType' = 'link' then
    if coalesce(attachment_payload->>'url', '') !~* '^https://.+' then raise exception 'Only HTTPS links are allowed.'; end if;
  else
    if object_path is null
      or object_path !~ ('^' || actor::text || '/' || task_document_id || '/[^/]+$')
      or not exists (select 1 from storage.objects where bucket_id = 'task-attachments' and name = object_path and owner_id = actor) then
      raise exception 'The uploaded file is invalid or does not belong to you.';
    end if;
    item := jsonb_set(item, '{url}', '""'::jsonb, true);
  end if;

  task_data := jsonb_set(task_data, '{attachments}', coalesce(task_data->'attachments', '[]'::jsonb) || jsonb_build_array(item), true);
  perform set_config('app.task_attachment', 'on', true);
  update public.company_data_documents set payload = task_data where id = task_row.id;
  return jsonb_build_object('task', task_data, 'attachment', item);
end;
$$;
revoke all on function public.add_company_task_attachment(text, jsonb) from public;
grant execute on function public.add_company_task_attachment(text, jsonb) to authenticated;

-- Attachment lists are append-only and must pass through the locked function
-- above. This prevents a stale browser tab from replacing another user's list.
create or replace function public.retain_task_attachments()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.kind = 'task' and new.payload->'attachments' is distinct from old.payload->'attachments'
    and auth.uid() is not null and coalesce(current_setting('app.task_attachment', true), '') <> 'on' then
    raise exception 'Task attachments must be added through add_company_task_attachment.';
  end if;
  if old.kind = 'task' and exists (
    select 1 from jsonb_array_elements(coalesce(old.payload->'attachments', '[]'::jsonb)) old_item
    where not exists (select 1 from jsonb_array_elements(coalesce(new.payload->'attachments', '[]'::jsonb)) new_item where new_item = old_item)
  ) then raise exception 'Existing task attachments cannot be removed or changed.'; end if;
  return new;
end;
$$;
drop trigger if exists retain_task_attachments on public.company_data_documents;
create trigger retain_task_attachments before update on public.company_data_documents
for each row execute function public.retain_task_attachments();
