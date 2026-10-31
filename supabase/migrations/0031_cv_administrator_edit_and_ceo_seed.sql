-- The three named CV administrators can maintain an employee CV without
-- weakening the privacy rule: all other employees still manage only their own.
create or replace function public.save_employee_cv_profile(target_employee_id uuid, cv_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  actor uuid := auth.uid();
  prior jsonb;
  result jsonb;
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  if target_employee_id is null then raise exception 'An employee is required.'; end if;
  if target_employee_id <> actor and not public.is_cv_administrator() then
    raise exception 'Only designated CV administrators may edit another employee profile.';
  end if;
  if not exists (select 1 from public.profiles where id = target_employee_id and status = 'active') then
    raise exception 'The selected employee is not active.';
  end if;
  if length(coalesce(cv_payload->>'professionalSummary','')) > 3000
    or length(coalesce(cv_payload->>'specializations','')) > 3000
    or length(coalesce(cv_payload->>'experienceHighlights','')) > 5000
    or length(coalesce(cv_payload->>'educationCertifications','')) > 5000
    or length(coalesce(cv_payload->>'languages','')) > 1000
    or length(coalesce(cv_payload->>'phone','')) > 120
    or length(coalesce(cv_payload->>'linkedin','')) > 500
    or length(coalesce(cv_payload->>'portfolio','')) > 500
    or length(coalesce(cv_payload->>'location','')) > 500
  then raise exception 'CV field is too long.'; end if;

  select payload into prior
  from public.company_data_documents
  where kind = 'cv_profile' and document_id = target_employee_id::text
  for update;

  -- Revisions are retained as append-only company records. This editor only
  -- updates structured profile details and cannot replace revision history.
  result := jsonb_build_object(
    'professionalSummary', coalesce(cv_payload->>'professionalSummary',''),
    'specializations', coalesce(cv_payload->>'specializations',''),
    'experienceHighlights', coalesce(cv_payload->>'experienceHighlights',''),
    'educationCertifications', coalesce(cv_payload->>'educationCertifications',''),
    'languages', coalesce(cv_payload->>'languages',''),
    'phone', coalesce(cv_payload->>'phone',''),
    'linkedin', coalesce(cv_payload->>'linkedin',''),
    'portfolio', coalesce(cv_payload->>'portfolio',''),
    'location', coalesce(cv_payload->>'location',''),
    'revisions', coalesce(prior->'revisions', '[]'::jsonb),
    'updatedAt', to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedBy', actor::text
  );

  if prior is null then
    insert into public.company_data_documents(kind, document_id, owner_id, payload)
    values ('cv_profile', target_employee_id::text, target_employee_id, result);
  else
    update public.company_data_documents
    set payload = result
    where kind = 'cv_profile' and document_id = target_employee_id::text;
  end if;
  return result;
end;
$$;
revoke all on function public.save_employee_cv_profile(uuid, jsonb) from public;
grant execute on function public.save_employee_cv_profile(uuid, jsonb) to authenticated;

-- Add a conservative editable starting profile for Dr. Mohamed Badawy only
-- where a section is empty; existing employee-entered information is retained.
insert into public.company_data_documents(kind, document_id, owner_id, payload)
select
  'cv_profile', p.id::text, p.id,
  jsonb_build_object(
    'professionalSummary', 'Chief Executive Officer at Geoinformatics for Information Systems, responsible for company strategy, operational governance, and the delivery of reliable geospatial workforce services.',
    'specializations', 'Executive Leadership; Corporate Strategy; Operational Governance; Business Development; Performance Management; Geospatial Services; Stakeholder Management',
    'experienceHighlights', 'Leads company-wide planning, service delivery oversight, and cross-functional coordination for Geoinformatics for Information Systems.',
    'educationCertifications', '', 'languages', '', 'phone', '', 'linkedin', '', 'portfolio', '', 'location', '',
    'revisions', '[]'::jsonb
  )
from public.profiles p
where p.employee_code = 'GEO-001' and p.status = 'active'
on conflict (kind, document_id) do update
set payload = public.company_data_documents.payload || jsonb_build_object(
  'professionalSummary', coalesce(nullif(public.company_data_documents.payload->>'professionalSummary',''), excluded.payload->>'professionalSummary'),
  'specializations', coalesce(nullif(public.company_data_documents.payload->>'specializations',''), excluded.payload->>'specializations'),
  'experienceHighlights', coalesce(nullif(public.company_data_documents.payload->>'experienceHighlights',''), excluded.payload->>'experienceHighlights')
);
