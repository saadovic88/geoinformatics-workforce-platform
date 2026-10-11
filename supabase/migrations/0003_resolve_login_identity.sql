-- Enables sign-in using an employee username (for example: mohamed.mokhtar)
-- or employee code while keeping the profiles directory protected by RLS.
create or replace function public.resolve_login_email(identity_input text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(p.username) = lower(trim(identity_input))
     or lower(p.employee_code) = lower(trim(identity_input))
     or lower(p.email) = lower(trim(identity_input))
  limit 1;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
