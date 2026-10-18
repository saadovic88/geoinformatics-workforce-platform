-- Company data retention: operational records are never hard-deleted by the app.
-- Each previous version is retained for audit and recovery before an update or
-- a privileged/service deletion. Apply after migrations 0010-0013.

create table if not exists public.company_data_document_history (
  id uuid primary key default gen_random_uuid(),
  document_row_id uuid not null,
  kind text not null,
  document_id text not null,
  owner_id uuid,
  payload jsonb not null,
  operation text not null check (operation in ('baseline', 'update', 'delete')),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists company_document_history_lookup_idx
  on public.company_data_document_history (kind, document_id, changed_at desc);

alter table public.company_data_document_history enable row level security;

drop policy if exists "company document history privileged read" on public.company_data_document_history;
create policy "company document history privileged read" on public.company_data_document_history
for select to authenticated
using (public.is_privileged());

create or replace function public.capture_company_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_data_document_history (
    document_row_id, kind, document_id, owner_id, payload, operation, changed_by
  ) values (
    old.id, old.kind, old.document_id, old.owner_id, old.payload,
    lower(tg_op), auth.uid()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists company_data_documents_history on public.company_data_documents;
create trigger company_data_documents_history
before update or delete on public.company_data_documents
for each row execute function public.capture_company_document_history();

-- A removed employee profile must not cascade and erase operational documents.
alter table public.company_data_documents
  drop constraint if exists company_data_documents_owner_id_fkey;
alter table public.company_data_documents
  add constraint company_data_documents_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete set null;

-- No browser/API role can hard-delete central documents. The application uses
-- archival status instead; service-role deletions remain historically captured.
drop policy if exists "company documents privileged delete" on public.company_data_documents;

-- Capture a recoverable starting snapshot of every existing document once.
insert into public.company_data_document_history (
  document_row_id, kind, document_id, owner_id, payload, operation, changed_by
)
select d.id, d.kind, d.document_id, d.owner_id, d.payload, 'baseline', null
from public.company_data_documents d
where not exists (
  select 1
  from public.company_data_document_history h
  where h.document_row_id = d.id and h.operation = 'baseline'
);

-- Profile changes are also retained, independently of the live profile row.
create table if not exists public.profile_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  snapshot jsonb not null,
  operation text not null check (operation in ('baseline', 'update', 'delete')),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists profile_history_lookup_idx
  on public.profile_history (profile_id, changed_at desc);

alter table public.profile_history enable row level security;

drop policy if exists "profile history privileged read" on public.profile_history;
create policy "profile history privileged read" on public.profile_history
for select to authenticated
using (public.is_privileged());

create or replace function public.capture_profile_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_history (profile_id, snapshot, operation, changed_by)
  values (old.id, to_jsonb(old), lower(tg_op), auth.uid());

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_history on public.profiles;
create trigger profiles_history
before update or delete on public.profiles
for each row execute function public.capture_profile_history();

insert into public.profile_history (profile_id, snapshot, operation, changed_by)
select p.id, to_jsonb(p), 'baseline', null
from public.profiles p
where not exists (
  select 1 from public.profile_history h
  where h.profile_id = p.id and h.operation = 'baseline'
);
