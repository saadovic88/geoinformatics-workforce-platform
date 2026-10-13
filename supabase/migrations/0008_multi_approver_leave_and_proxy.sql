-- A leave request requires Amr, Badr and Dr. Mohamed Badawy, plus the
-- relevant department head when distinct (Saad / Sherif / Kyrillos).
-- The proxy is a mandatory, notified work-cover assignment.

alter table public.leave_requests
  add column if not exists proxy_employee_id uuid references public.profiles(id);

drop policy if exists "leave requests create self only" on public.leave_requests;
create policy "leave requests create self with proxy" on public.leave_requests
for insert to authenticated
with check (
  employee_id = auth.uid()
  and public.can_submit_leave()
  and proxy_employee_id is not null
  and proxy_employee_id <> employee_id
);

create or replace function public.is_allowed_leave_approver(
  target_employee_id uuid,
  candidate_approver_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles candidate
    join public.profiles requester on requester.id = target_employee_id
    where candidate.id = candidate_approver_id
      and (
        candidate.email in (
          'm.badawy@geoinformatics.com',
          'amr.soghayar@geoinformatics.com',
          'badr.salama@geoinformatics.com'
        )
        or (requester.department_id = 'gis' and candidate.role_id = 'gis_manager')
        or (requester.department_id = 'remote_sensing' and candidate.role_id = 'rs_manager')
        or (requester.department_id = 'training' and candidate.role_id = 'training_manager')
      )
  );
$$;

drop policy if exists "assigned approver updates own step" on public.leave_approval_steps;
create policy "assigned approver updates own step" on public.leave_approval_steps
for update to authenticated
using (
  approver_id = auth.uid()
  and exists (
    select 1 from public.leave_requests request
    where request.id = leave_request_id
      and public.is_allowed_leave_approver(request.employee_id, approver_id)
  )
)
with check (approver_id = auth.uid());

-- Only an eligible required signer may be added to a request. A server-side
-- workflow/service role may create the complete multi-signature set.
create policy "eligible leave approver steps only" on public.leave_approval_steps
for insert to authenticated
with check (
  exists (
    select 1 from public.leave_requests request
    where request.id = leave_request_id
      and public.is_allowed_leave_approver(request.employee_id, approver_id)
  )
);

