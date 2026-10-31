-- Passwords themselves are never stored in application tables. This audit
-- trail records only security events, their target, actor, and timestamp.
create or replace function public.is_password_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and email in (
        'm.badawy@geoinformatics.com',
        'amr.soghayar@geoinformatics.com',
        'badr.salama@geoinformatics.com'
      )
  );
$$;
revoke all on function public.is_password_administrator() from public;
grant execute on function public.is_password_administrator() to authenticated;

create table if not exists public.password_security_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('password_changed', 'reset_requested')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists password_security_events_employee_time_idx
  on public.password_security_events(employee_id, occurred_at desc);

alter table public.password_security_events enable row level security;
drop policy if exists "password security events administrators read" on public.password_security_events;
create policy "password security events administrators read"
on public.password_security_events for select to authenticated
using (public.is_password_administrator());

-- A change made through Supabase Auth is captured at the source of truth,
-- including recovery links. encrypted_password is compared only; it is never
-- selected, returned, or copied into a company record.
create or replace function public.capture_password_security_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    insert into public.password_security_events(employee_id, actor_id, event_type, metadata)
    values (
      new.id,
      auth.uid(),
      'password_changed',
      jsonb_build_object('source', case when auth.uid() = new.id then 'employee_self_service' else 'secure_recovery_or_system' end)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists auth_password_security_event on auth.users;
create trigger auth_password_security_event
after update of encrypted_password on auth.users
for each row execute function public.capture_password_security_event();

-- Called only after the administrator has successfully requested Supabase to
-- email a recovery link. It records the request, not a password.
create or replace function public.record_password_reset_request(target_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not public.is_password_administrator() then
    raise exception 'Only designated password administrators may request a reset.';
  end if;
  if target_employee_id is null or not exists (
    select 1 from public.profiles where id = target_employee_id and status = 'active'
  ) then raise exception 'The selected employee is not active.'; end if;
  insert into public.password_security_events(employee_id, actor_id, event_type, metadata)
  values (target_employee_id, auth.uid(), 'reset_requested', jsonb_build_object('source', 'administrator_requested_recovery_email'));
end;
$$;
revoke all on function public.record_password_reset_request(uuid) from public;
grant execute on function public.record_password_reset_request(uuid) to authenticated;
