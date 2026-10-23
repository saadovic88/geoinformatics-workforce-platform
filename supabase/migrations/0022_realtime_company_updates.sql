-- Deliver authorized company changes to every open client immediately.
-- Realtime still applies the table's RLS policies per connected user.
do $$
begin
  alter publication supabase_realtime add table public.company_data_documents;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication is managed by Supabase and was not found.';
end $$;
