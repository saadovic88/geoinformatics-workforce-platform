# Supabase setup

1. Create a Supabase project and enable Email/Password under **Authentication → Providers**.
2. Run `migrations/0001_initial_schema.sql` in the SQL Editor (or install the Supabase CLI and run `supabase db push`).
3. Copy the project URL and anon key to `.env.local` using `.env.example` as the template.
4. Create users from **Authentication → Users**. For each user, add metadata before creation: `employee_code`, `username`, `name_en`, `name_ar`, `job_title_en`, `job_title_ar`, `role_id`, and `department_id`. The `auth_user_profile` trigger creates the matching `profiles` record automatically. For users that existed before this migration, create their profile manually using their Auth UUID.

The migration includes normalized tables, foreign keys, indexes, timestamps, private Storage buckets, seed departments/roles, and RLS. The Vite browser must only receive `VITE_SUPABASE_ANON_KEY`; keep `service_role` in a trusted server or Supabase Edge Function.

## First administrator

Create the first Auth user with `role_id: "sys_admin"` (or `"ceo"`) and `department_id: "executive"`. Sign in using their email/password. Email is the actual authentication credential; the app also accepts a profile username and resolves it to the email before sign-in.

## Create all project users

After the migration has run, use `scripts/seed-supabase-users.mjs`. Put `SUPABASE_URL`, a newly rotated `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, and `INITIAL_PASSWORD` in an ignored local `.env` file, then run `npm run seed:users`. The named admin is the only `sys_admin`; all 16 existing team members get their intended roles and manager relationships.
