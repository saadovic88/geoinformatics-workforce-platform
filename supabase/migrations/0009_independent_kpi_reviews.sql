-- Each named company leader maintains an independent KPI assessment for every
-- employee and month. A review is never overwritten by another evaluator.

alter table public.monthly_kpi_records
  add column if not exists evaluator_id uuid references public.profiles(id);

-- Preserve historical monthly evaluations as CEO reviews when the original
-- evaluator is unavailable. Existing reviewed_by values remain intact.
update public.monthly_kpi_records record
set evaluator_id = coalesce(
  record.evaluator_id,
  record.reviewed_by,
  (select id from public.profiles where email = 'm.badawy@geoinformatics.com' limit 1)
)
where record.evaluator_id is null;

alter table public.monthly_kpi_records
  alter column evaluator_id set not null;

alter table public.monthly_kpi_records
  drop constraint if exists monthly_kpi_records_employee_id_year_month_key;

alter table public.monthly_kpi_records
  add constraint monthly_kpi_records_employee_month_evaluator_key
  unique (employee_id, year, month, evaluator_id);

-- Company leaders can see all KPI reviews, but each can create, amend, or
-- delete only the review carrying their own evaluator identity.
drop policy if exists "kpi manage" on public.monthly_kpi_records;
drop policy if exists "kpi evaluator insert" on public.monthly_kpi_records;
drop policy if exists "kpi evaluator update" on public.monthly_kpi_records;
drop policy if exists "kpi evaluator delete" on public.monthly_kpi_records;

create policy "kpi evaluator insert" on public.monthly_kpi_records
for insert to authenticated
with check (public.is_privileged() and evaluator_id = auth.uid());

create policy "kpi evaluator update" on public.monthly_kpi_records
for update to authenticated
using (public.is_privileged() and evaluator_id = auth.uid())
with check (public.is_privileged() and evaluator_id = auth.uid());

create policy "kpi evaluator delete" on public.monthly_kpi_records
for delete to authenticated
using (public.is_privileged() and evaluator_id = auth.uid());
