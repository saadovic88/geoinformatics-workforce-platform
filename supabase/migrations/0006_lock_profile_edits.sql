-- Client-side controls improve usability; RLS makes the same boundary real.
-- Employee profile details, role assignments and reporting structure are edited
-- only by the three named platform administrators.
drop policy if exists "profile self update" on public.profiles;
create policy "profiles update named administrators" on public.profiles
for update to authenticated
using (public.is_privileged())
with check (public.is_privileged());

-- A user may mark only their own notification as read. No client can change
-- the notification state of another employee.
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
