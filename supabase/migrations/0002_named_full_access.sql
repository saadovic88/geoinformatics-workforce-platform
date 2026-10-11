-- Keep business titles intact while granting the named leadership accounts
-- full RLS access across the platform.
create or replace function public.is_privileged()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role_id = 'sys_admin' or email in (
        'm.badawy@geoinformatics.com',
        'm.omar@geoinformatics.com',
        'amr.soghayar@geoinformatics.com',
        'badr.salama@geoinformatics.com'
      ))
  );
$$;
