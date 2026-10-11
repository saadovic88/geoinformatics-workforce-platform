-- Geoinformatics Workforce Platform: initial production schema
-- Run with: supabase db push (or paste into Supabase SQL Editor).
create extension if not exists pgcrypto;

create type public.employee_status as enum ('active', 'inactive');
create type public.attendance_status as enum ('present_inside','remote_approved','external_approved','outside_review','outside_exception','late','absent','on_leave');
create type public.leave_status as enum ('pending_approval','partially_approved','approved','rejected','cancelled');
create type public.approval_status as enum ('pending','approved','rejected');
create type public.task_status as enum ('not_started','in_progress','blocked','submitted','needs_revision','completed','cancelled','overdue');
create type public.task_priority as enum ('low','medium','high','critical');
create type public.kpi_status as enum ('draft','submitted','published');
create type public.notification_type as enum ('attendance','leave','task','kpi','system','geofence');

create table public.departments (
  id text primary key, name_en text not null, name_ar text not null,
  parent_id text references public.departments(id) on delete set null,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.roles (
  id text primary key, name_en text not null, name_ar text not null,
  is_system boolean not null default false, created_at timestamptz not null default now()
);
create table public.work_schedules (
  id uuid primary key default gen_random_uuid(), name_en text not null, name_ar text not null,
  required_daily_hours numeric(4,2) not null check (required_daily_hours >= 0),
  official_start_time time not null, official_end_time time not null,
  break_duration_minutes integer not null default 0 check (break_duration_minutes >= 0),
  grace_period_minutes integer not null default 0 check (grace_period_minutes >= 0),
  working_days smallint[] not null default '{0,1,2,3,4}' check (working_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code text not null unique, username text not null unique,
  name_en text not null, name_ar text not null, email text not null unique, phone text,
  job_title_en text not null, job_title_ar text not null,
  role_id text not null references public.roles(id), department_id text not null references public.departments(id),
  manager_id uuid references public.profiles(id) on delete set null,
  work_schedule_id uuid references public.work_schedules(id) on delete set null,
  status public.employee_status not null default 'active', avatar_url text, joining_date date,
  emergency_contact jsonb not null default '{}'::jsonb,
  first_login_password_changed boolean not null default false, last_login_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.permission_rules (
  role_id text not null references public.roles(id) on delete cascade,
  module text not null, can_view boolean not null default false, can_create boolean not null default false,
  can_edit boolean not null default false, can_delete boolean not null default false,
  can_approve boolean not null default false, can_export boolean not null default false, can_manage boolean not null default false,
  primary key (role_id, module)
);
create table public.geofence_zones (
  id uuid primary key default gen_random_uuid(), name_en text not null, name_ar text not null,
  latitude double precision not null check (latitude between -90 and 90), longitude double precision not null check (longitude between -180 and 180),
  radius_meters numeric(10,2) not null check (radius_meters > 0), is_active boolean not null default true,
  is_primary boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index geofence_one_primary_idx on public.geofence_zones (is_primary) where is_primary;
create table public.holidays (
  id uuid primary key default gen_random_uuid(), name_en text not null, name_ar text not null,
  holiday_date date not null, is_recurring boolean not null default false, created_at timestamptz not null default now(),
  unique(holiday_date, name_en)
);
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null, check_in_at timestamptz not null, check_out_at timestamptz,
  check_in_latitude double precision, check_in_longitude double precision, check_out_latitude double precision, check_out_longitude double precision,
  distance_meters numeric(12,2), status public.attendance_status not null, status_notes text,
  total_duration_minutes integer not null default 0 check (total_duration_minutes >= 0), break_duration_minutes integer not null default 0 check (break_duration_minutes >= 0),
  net_worked_hours numeric(6,2) not null default 0, required_daily_hours numeric(4,2) not null default 0,
  regular_hours numeric(6,2) not null default 0, overtime_hours numeric(6,2) not null default 0, late_minutes integer not null default 0,
  early_leave_minutes integer not null default 0, source text not null check (source in ('auto_login','manual','mobile','system_close')),
  evidence_url text, review_status public.approval_status, reviewed_by uuid references public.profiles(id), review_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(employee_id, attendance_date)
);
create index attendance_employee_date_idx on public.attendance_records(employee_id, attendance_date desc);
create table public.leave_balances (
  employee_id uuid not null references public.profiles(id) on delete cascade, leave_type text not null,
  entitlement numeric(8,2) not null default 0, used numeric(8,2) not null default 0, pending numeric(8,2) not null default 0,
  carried_over numeric(8,2) not null default 0, unit text not null check (unit in ('days','hours')),
  primary key(employee_id, leave_type), check (entitlement >= 0 and used >= 0 and pending >= 0)
);
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id), leave_type text not null,
  start_date date not null, end_date date not null, start_time time, end_time time, duration_units numeric(8,2) not null check (duration_units > 0),
  unit text not null check (unit in ('days','hours')), reason text not null, notes text, attachment_name text, attachment_path text,
  handover_notes text, contact_while_away text, status public.leave_status not null default 'pending_approval',
  external_site_details jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(end_date >= start_date)
);
create index leave_requests_employee_dates_idx on public.leave_requests(employee_id, start_date desc);
create table public.leave_approval_steps (
  id uuid primary key default gen_random_uuid(), leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  approver_id uuid not null references public.profiles(id), step_order smallint not null check(step_order > 0),
  status public.approval_status not null default 'pending', action_at timestamptz, notes text, unique(leave_request_id, approver_id), unique(leave_request_id, step_order)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', project_name text not null,
  department_id text not null references public.departments(id), creator_id uuid not null references public.profiles(id),
  priority public.task_priority not null default 'medium', status public.task_status not null default 'not_started',
  start_date date, due_date date, deadline_time time, estimated_hours numeric(8,2) not null default 0, actual_hours numeric(8,2) not null default 0,
  progress_percent smallint not null default 0 check(progress_percent between 0 and 100), notes text, review_score smallint check(review_score between 0 and 100), manager_review_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tasks_department_status_idx on public.tasks(department_id, status, due_date);
create table public.task_assignees (task_id uuid references public.tasks(id) on delete cascade, employee_id uuid references public.profiles(id) on delete cascade, assigned_at timestamptz not null default now(), primary key(task_id, employee_id));
create table public.task_subtasks (id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade, title text not null, is_completed boolean not null default false, position integer not null default 0, created_at timestamptz not null default now());
create table public.task_attachments (id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade, name text not null, file_type text not null, file_size text, storage_path text, url text, uploaded_by uuid references public.profiles(id), uploaded_at timestamptz not null default now());
create table public.task_comments (id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade, user_id uuid not null references public.profiles(id), content text not null, created_at timestamptz not null default now());
create table public.task_activity_logs (id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade, user_id uuid references public.profiles(id), action text not null, created_at timestamptz not null default now());
create table public.monthly_kpi_records (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.profiles(id) on delete cascade, year smallint not null check(year between 2000 and 2200), month smallint not null check(month between 1 and 12),
  attendance_score jsonb not null, work_score jsonb not null, behavior_score jsonb not null, self_dev_score jsonb not null,
  total_score numeric(5,2) not null check(total_score between 0 and 100), status public.kpi_status not null default 'draft', published_at timestamptz, reviewed_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(employee_id, year, month)
);
create table public.kpi_evidence_links (id uuid primary key default gen_random_uuid(), kpi_record_id uuid not null references public.monthly_kpi_records(id) on delete cascade, title text not null, url text not null, category text not null);
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, title_en text not null, title_ar text not null, message_en text not null, message_ar text not null, type public.notification_type not null, priority text not null check(priority in ('low','medium','high')), is_read boolean not null default false, action_url text, created_at timestamptz not null default now());
create index notifications_user_unread_idx on public.notifications(user_id, is_read, created_at desc);
create table public.audit_logs (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null, user_name text not null, action text not null, module text not null, details text not null default '', ip_address inet, created_at timestamptz not null default now());

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.is_privileged() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from profiles where id = auth.uid() and role_id in ('ceo','sys_admin','admin_manager')); $$;
create or replace function public.is_manager_of(target uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from profiles where id = target and manager_id = auth.uid()) or public.is_privileged(); $$;
-- SECURITY DEFINER helpers avoid recursive RLS evaluation between parent records and child tables.
create or replace function public.is_task_member(target_task_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from task_assignees where task_id = target_task_id and employee_id = auth.uid()); $$;
create or replace function public.is_leave_approver(target_request_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from leave_approval_steps where leave_request_id = target_request_id and approver_id = auth.uid()); $$;
-- Used during sign-in so usernames and employee codes work before a session exists.
create or replace function public.resolve_login_email(identity_input text) returns text language sql stable security definer set search_path = public as $$ select p.email from public.profiles p where lower(p.username) = lower(trim(identity_input)) or lower(p.employee_code) = lower(trim(identity_input)) or lower(p.email) = lower(trim(identity_input)) limit 1; $$;
revoke all on function public.resolve_login_email(text) from public; grant execute on function public.resolve_login_email(text) to anon, authenticated;
create trigger schedules_updated before update on public.work_schedules for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger zones_updated before update on public.geofence_zones for each row execute function public.set_updated_at();
create trigger attendance_updated before update on public.attendance_records for each row execute function public.set_updated_at();
create trigger leaves_updated before update on public.leave_requests for each row execute function public.set_updated_at();
create trigger tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create trigger kpi_updated before update on public.monthly_kpi_records for each row execute function public.set_updated_at();

-- When an administrator creates an Auth user, metadata creates the matching profile.
-- Required metadata: employee_code, username, name_en, name_ar, job_title_en, job_title_ar, role_id, department_id.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, employee_code, username, name_en, name_ar, email, job_title_en, job_title_ar, role_id, department_id, phone, joining_date)
  values (
    new.id, new.raw_user_meta_data->>'employee_code', coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name_en', new.email), coalesce(new.raw_user_meta_data->>'name_ar', new.email), new.email,
    coalesce(new.raw_user_meta_data->>'job_title_en', 'Employee'), coalesce(new.raw_user_meta_data->>'job_title_ar', 'موظف'),
    coalesce(new.raw_user_meta_data->>'role_id', 'gis_specialist'), coalesce(new.raw_user_meta_data->>'department_id', 'gis'),
    new.raw_user_meta_data->>'phone', coalesce((new.raw_user_meta_data->>'joining_date')::date, current_date)
  );
  return new;
end; $$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.handle_new_user();

-- Row level security. The client uses only the anon key; service_role remains server-only.
alter table public.departments enable row level security; alter table public.roles enable row level security; alter table public.work_schedules enable row level security; alter table public.profiles enable row level security; alter table public.permission_rules enable row level security; alter table public.geofence_zones enable row level security; alter table public.holidays enable row level security; alter table public.attendance_records enable row level security; alter table public.leave_balances enable row level security; alter table public.leave_requests enable row level security; alter table public.leave_approval_steps enable row level security; alter table public.tasks enable row level security; alter table public.task_assignees enable row level security; alter table public.task_subtasks enable row level security; alter table public.task_attachments enable row level security; alter table public.task_comments enable row level security; alter table public.task_activity_logs enable row level security; alter table public.monthly_kpi_records enable row level security; alter table public.kpi_evidence_links enable row level security; alter table public.notifications enable row level security; alter table public.audit_logs enable row level security;
create policy "authenticated read directory" on public.profiles for select to authenticated using (true);
create policy "profile self update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_privileged()) with check (id = auth.uid() or public.is_privileged());
create policy "settings read" on public.departments for select to authenticated using (true); create policy "settings manage departments" on public.departments for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "roles read" on public.roles for select to authenticated using (true); create policy "roles manage" on public.roles for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "schedules read" on public.work_schedules for select to authenticated using (true); create policy "schedules manage" on public.work_schedules for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "permissions read" on public.permission_rules for select to authenticated using (true); create policy "permissions manage" on public.permission_rules for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "zones read" on public.geofence_zones for select to authenticated using (true); create policy "zones manage" on public.geofence_zones for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "holidays read" on public.holidays for select to authenticated using (true); create policy "holidays manage" on public.holidays for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "attendance read" on public.attendance_records for select to authenticated using (employee_id = auth.uid() or public.is_manager_of(employee_id)); create policy "attendance create self" on public.attendance_records for insert to authenticated with check (employee_id = auth.uid()); create policy "attendance update" on public.attendance_records for update to authenticated using (employee_id = auth.uid() or public.is_manager_of(employee_id)) with check (employee_id = auth.uid() or public.is_manager_of(employee_id));
create policy "balances read" on public.leave_balances for select to authenticated using (employee_id = auth.uid() or public.is_manager_of(employee_id)); create policy "balances manage" on public.leave_balances for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "leaves read" on public.leave_requests for select to authenticated using (employee_id = auth.uid() or public.is_manager_of(employee_id) or public.is_leave_approver(id)); create policy "leaves create self" on public.leave_requests for insert to authenticated with check (employee_id = auth.uid()); create policy "leaves update" on public.leave_requests for update to authenticated using (employee_id = auth.uid() or public.is_manager_of(employee_id)) with check (employee_id = auth.uid() or public.is_manager_of(employee_id));
create policy "approval steps read" on public.leave_approval_steps for select to authenticated using (approver_id = auth.uid() or public.is_privileged() or exists(select 1 from public.leave_requests r where r.id = leave_request_id and r.employee_id = auth.uid())); create policy "approver updates own step" on public.leave_approval_steps for update to authenticated using (approver_id = auth.uid() or public.is_privileged()) with check (approver_id = auth.uid() or public.is_privileged()); create policy "privileged create approvals" on public.leave_approval_steps for insert to authenticated with check (public.is_privileged());
create policy "tasks read" on public.tasks for select to authenticated using (creator_id = auth.uid() or public.is_manager_of(creator_id) or public.is_task_member(id)); create policy "tasks create" on public.tasks for insert to authenticated with check (creator_id = auth.uid() or public.is_privileged()); create policy "tasks update" on public.tasks for update to authenticated using (creator_id = auth.uid() or public.is_manager_of(creator_id)) with check (creator_id = auth.uid() or public.is_manager_of(creator_id));
create policy "task children read" on public.task_assignees for select to authenticated using (public.is_task_member(task_id) or exists(select 1 from public.tasks t where t.id=task_id and (t.creator_id=auth.uid() or public.is_manager_of(t.creator_id)))); create policy "task assignment manage" on public.task_assignees for all to authenticated using (exists(select 1 from public.tasks t where t.id=task_id and (t.creator_id=auth.uid() or public.is_manager_of(t.creator_id)))) with check (true);
create policy "subtasks read" on public.task_subtasks for select to authenticated using (public.is_task_member(task_id) or exists(select 1 from public.tasks t where t.id=task_id and (t.creator_id=auth.uid() or public.is_manager_of(t.creator_id)))); create policy "subtasks update" on public.task_subtasks for all to authenticated using (public.is_task_member(task_id) or exists(select 1 from public.tasks t where t.id=task_id and (t.creator_id=auth.uid() or public.is_manager_of(t.creator_id)))) with check (true);
create policy "attachments read" on public.task_attachments for select to authenticated using (public.is_task_member(task_id) or exists(select 1 from public.tasks t where t.id=task_id and (t.creator_id=auth.uid() or public.is_manager_of(t.creator_id)))); create policy "attachments add" on public.task_attachments for insert to authenticated with check (uploaded_by=auth.uid() and public.is_task_member(task_id));
create policy "comments read" on public.task_comments for select to authenticated using (public.is_task_member(task_id) or exists(select 1 from public.tasks t where t.id=task_id and (t.creator_id=auth.uid() or public.is_manager_of(t.creator_id)))); create policy "comments add" on public.task_comments for insert to authenticated with check (user_id=auth.uid() and public.is_task_member(task_id)); create policy "activity read" on public.task_activity_logs for select to authenticated using (public.is_task_member(task_id) or exists(select 1 from public.tasks t where t.id=task_id and (t.creator_id=auth.uid() or public.is_manager_of(t.creator_id)))); create policy "activity add" on public.task_activity_logs for insert to authenticated with check ((user_id=auth.uid() and public.is_task_member(task_id)) or public.is_privileged());
create policy "kpi read" on public.monthly_kpi_records for select to authenticated using (employee_id=auth.uid() or public.is_manager_of(employee_id)); create policy "kpi manage" on public.monthly_kpi_records for all to authenticated using (public.is_manager_of(employee_id)) with check (public.is_manager_of(employee_id)); create policy "evidence read" on public.kpi_evidence_links for select to authenticated using (exists(select 1 from public.monthly_kpi_records k where k.id=kpi_record_id)); create policy "evidence manage" on public.kpi_evidence_links for all to authenticated using (public.is_privileged()) with check (public.is_privileged());
create policy "notifications own" on public.notifications for select to authenticated using (user_id=auth.uid()); create policy "notifications update own" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid()); create policy "notifications create privileged" on public.notifications for insert to authenticated with check (public.is_privileged()); create policy "audit read privileged" on public.audit_logs for select to authenticated using (public.is_privileged()); create policy "audit insert" on public.audit_logs for insert to authenticated with check (user_id=auth.uid() or public.is_privileged());

-- Private buckets: create in Dashboard if preferred. Policies cover authenticated file ownership.
insert into storage.buckets (id, name, public) values ('task-attachments','task-attachments',false),('leave-attachments','leave-attachments',false),('avatars','avatars',false) on conflict (id) do nothing;
create policy "authenticated read files" on storage.objects for select to authenticated using (bucket_id in ('task-attachments','leave-attachments','avatars'));
create policy "users upload own files" on storage.objects for insert to authenticated with check (bucket_id in ('task-attachments','leave-attachments','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users change own files" on storage.objects for update to authenticated using ((storage.foldername(name))[1] = auth.uid()::text) with check ((storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own files" on storage.objects for delete to authenticated using ((storage.foldername(name))[1] = auth.uid()::text);

insert into public.departments(id,name_en,name_ar) values ('executive','Executive','الإدارة التنفيذية'),('management','Management','الإدارة'),('gis','GIS','نظم المعلومات الجغرافية'),('remote_sensing','Remote Sensing','الاستشعار عن بعد'),('training','Training','التدريب'),('technical','Technical','القسم التقني'),('administrative','Administrative','الشؤون الإدارية'),('hr','Human Resources','الموارد البشرية') on conflict do nothing;
insert into public.roles(id,name_en,name_ar,is_system) values ('ceo','CEO','الرئيس التنفيذي',true),('co_founder','Co-Founder','شريك مؤسس',true),('admin_manager','Administration Manager','مدير إداري',true),('tech_manager','Technical Manager','مدير تقني',true),('gis_manager','GIS Manager','مدير GIS',true),('training_manager','Training Manager','مدير التدريب',true),('rs_manager','Remote Sensing Manager','مدير الاستشعار',true),('senior_specialist','Senior Specialist','أخصائي أول',true),('gis_specialist','GIS Specialist','أخصائي GIS',true),('rs_specialist','RS Specialist','أخصائي استشعار',true),('admin_specialist','Administration Specialist','أخصائي إداري',true),('hr_officer','HR Officer','مسؤول موارد بشرية',true),('sys_admin','System Administrator','مسؤول النظام',true) on conflict do nothing;
