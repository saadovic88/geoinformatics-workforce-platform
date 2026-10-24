-- Company records are permanent. Operational users archive/deactivate records;
-- neither the browser nor ordinary database roles may erase them.
-- Apply after 0023.

create or replace function public.prevent_company_document_delete()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Company records are permanent and cannot be deleted. Archive the record instead.';
end;
$$;

drop trigger if exists prevent_company_document_delete on public.company_data_documents;
create trigger prevent_company_document_delete
before delete on public.company_data_documents
for each row execute function public.prevent_company_document_delete();

-- Audit history is append-only. It is the recovery record if an authorised
-- update was made in error, so it must not be editable or removable later.
create or replace function public.prevent_company_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Company audit history is append-only and cannot be changed or deleted.';
end;
$$;

drop trigger if exists prevent_company_document_history_mutation on public.company_data_document_history;
create trigger prevent_company_document_history_mutation
before update or delete on public.company_data_document_history
for each row execute function public.prevent_company_history_mutation();

drop trigger if exists prevent_profile_history_mutation on public.profile_history;
create trigger prevent_profile_history_mutation
before update or delete on public.profile_history
for each row execute function public.prevent_company_history_mutation();

-- A file selected for a task is company evidence. Do not permit browser-side
-- deletion, including by its uploader. Failed-upload remnants stay private
-- and recoverable for an authorised retention review rather than disappearing.
drop policy if exists "users delete own files" on storage.objects;
drop policy if exists "task attachment owners can delete unlinked files" on storage.objects;
drop policy if exists "users change own files" on storage.objects;

-- There is intentionally no DELETE policy for private company buckets.
