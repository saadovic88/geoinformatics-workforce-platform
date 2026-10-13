-- Department-owned leave workflow.
-- A request is private to its employee and its explicitly assigned approver.
-- Mohamed Badawy and Amr El Soghayar are leave-exempt. Mohamed Omar and
-- Dr. Ghada are monitoring-only and cannot create or approve leave records.

create or replace function public.can_submit_leave()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and email not in (
        'm.badawy@geoinformatics.com',
        'amr.soghayar@geoinformatics.com',
        'm.omar@geoinformatics.com',
        'dr.ghada@geoinformatics.com'
      )
  );
$$;

-- Remove the broad people-operations route and the legacy direct-manager
-- read/update path. The approval-step assignment is now the sole authority.
drop policy if exists "leaves people operations read" on public.leave_requests;
drop policy if exists "leaves read" on public.leave_requests;
drop policy if exists "leaves update" on public.leave_requests;
drop policy if exists "leaves create self" on public.leave_requests;

create policy "leave requests private or assigned" on public.leave_requests
for select to authenticated
using (employee_id = auth.uid() or public.is_leave_approver(id));

create policy "leave requests create self only" on public.leave_requests
for insert to authenticated
with check (employee_id = auth.uid() and public.can_submit_leave());

-- Employees may only cancel/change their own request. Approval decisions are
-- performed through the assigned approval-step policy (or server workflow).
create policy "leave requests requester update" on public.leave_requests
for update to authenticated
using (employee_id = auth.uid())
with check (employee_id = auth.uid());

drop policy if exists "balances people operations read" on public.leave_balances;
drop policy if exists "balances read" on public.leave_balances;
create policy "leave balances own only" on public.leave_balances
for select to authenticated using (employee_id = auth.uid());

drop policy if exists "approval steps read" on public.leave_approval_steps;
drop policy if exists "approver updates own step" on public.leave_approval_steps;
drop policy if exists "privileged create approvals" on public.leave_approval_steps;

create policy "approval steps requester or assigned" on public.leave_approval_steps
for select to authenticated
using (
  approver_id = auth.uid()
  or exists (
    select 1 from public.leave_requests request
    where request.id = leave_request_id and request.employee_id = auth.uid()
  )
);

create policy "assigned approver updates own step" on public.leave_approval_steps
for update to authenticated
using (approver_id = auth.uid())
with check (approver_id = auth.uid());

