-- Central, durable document store for the application state. The browser cache
-- is only an offline fallback; operational records are kept in Supabase so a
-- user can continue from another browser or device.

create table if not exists public.company_data_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('attendance', 'zone', 'schedule', 'holiday', 'leave_request', 'leave_balance', 'task', 'kpi', 'notification', 'audit')),
  document_id text not null,
  owner_id uuid references public.profiles(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, document_id)
);

create index if not exists company_data_documents_owner_idx
  on public.company_data_documents(owner_id, kind, updated_at desc);

drop trigger if exists company_data_documents_updated on public.company_data_documents;
create trigger company_data_documents_updated
before update on public.company_data_documents
for each row execute function public.set_updated_at();

alter table public.company_data_documents enable row level security;

create or replace function public.can_access_company_document(
  record_kind text,
  record_owner uuid,
  record_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_privileged()
    or record_kind in ('zone', 'schedule', 'holiday')
    or record_owner = auth.uid()
    or (
      record_kind = 'task'
      and (
        record_payload->>'creatorId' = auth.uid()::text
        or coalesce(record_payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text
      )
    )
    or (
      record_kind = 'leave_request'
      and jsonb_path_exists(
        record_payload,
        '$.approvalSteps[*] ? (@.approverId == $viewer)',
        jsonb_build_object('viewer', to_jsonb(auth.uid()::text))
      )
    );
$$;

drop policy if exists "company documents scoped read" on public.company_data_documents;
create policy "company documents scoped read" on public.company_data_documents
for select to authenticated
using (public.can_access_company_document(kind, owner_id, payload));

drop policy if exists "company documents scoped insert" on public.company_data_documents;
create policy "company documents scoped insert" on public.company_data_documents
for insert to authenticated
with check (
  public.is_privileged()
  or (
    owner_id = auth.uid()
    and kind in ('attendance', 'leave_request', 'leave_balance', 'notification')
  )
  or (
    kind = 'task'
    and (payload->>'creatorId' = auth.uid()::text or coalesce(payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text)
  )
);

drop policy if exists "company documents scoped update" on public.company_data_documents;
create policy "company documents scoped update" on public.company_data_documents
for update to authenticated
using (public.can_access_company_document(kind, owner_id, payload))
with check (
  public.is_privileged()
  or (
    owner_id = auth.uid()
    and kind in ('attendance', 'leave_request', 'leave_balance', 'notification')
  )
  or (
    kind = 'task'
    and (payload->>'creatorId' = auth.uid()::text or coalesce(payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text)
  )
);

drop policy if exists "company documents privileged delete" on public.company_data_documents;
create policy "company documents privileged delete" on public.company_data_documents
for delete to authenticated
using (public.is_privileged());
