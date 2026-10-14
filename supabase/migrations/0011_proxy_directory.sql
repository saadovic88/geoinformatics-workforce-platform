-- Privacy-safe directory for the mandatory leave handover selection.
-- It deliberately returns only the fields needed to choose a colleague,
-- without exposing phone numbers, emails, attendance, leave, or KPI data.
create or replace function public.list_active_proxy_candidates()
returns table (
  id uuid,
  name_en text,
  name_ar text,
  job_title_en text,
  job_title_ar text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name_en, p.name_ar, p.job_title_en, p.job_title_ar
  from public.profiles p
  where p.status = 'active'
    and p.id <> auth.uid()
  order by p.name_en;
$$;

revoke all on function public.list_active_proxy_candidates() from public;
grant execute on function public.list_active_proxy_candidates() to authenticated;
