-- Device-specific Web Push subscriptions. A user may register several
-- laptops/phones; subscriptions are removed automatically when a provider
-- reports that a device is no longer valid.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  device_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id, updated_at desc);

drop trigger if exists push_subscriptions_updated on public.push_subscriptions;
create trigger push_subscriptions_updated
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions own read" on public.push_subscriptions;
create policy "push subscriptions own read" on public.push_subscriptions
for select to authenticated using (user_id = auth.uid());

drop policy if exists "push subscriptions own insert" on public.push_subscriptions;
create policy "push subscriptions own insert" on public.push_subscriptions
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "push subscriptions own update" on public.push_subscriptions;
create policy "push subscriptions own update" on public.push_subscriptions
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push subscriptions own delete" on public.push_subscriptions;
create policy "push subscriptions own delete" on public.push_subscriptions
for delete to authenticated using (user_id = auth.uid());
