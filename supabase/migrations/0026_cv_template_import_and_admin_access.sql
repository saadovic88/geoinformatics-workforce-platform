-- Only the three named HR/KPI administrators may read every employee CV.
-- Other employees and read-only observers can see only their own record.
create or replace function public.is_cv_administrator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active'
    and email in ('m.badawy@geoinformatics.com', 'amr.soghayar@geoinformatics.com', 'badr.salama@geoinformatics.com'));
$$;
revoke all on function public.is_cv_administrator() from public;
grant execute on function public.is_cv_administrator() to authenticated;

create or replace function public.can_access_company_document(record_kind text, record_owner uuid, record_payload jsonb)
returns boolean language sql stable security definer set search_path = public as $$
  select case when record_kind = 'cv_profile' then record_owner = auth.uid() or public.is_cv_administrator()
  else public.is_privileged() or public.is_read_only_observer() or record_kind in ('zone', 'schedule', 'holiday')
    or record_owner = auth.uid()
    or (record_kind = 'task' and (record_payload->>'creatorId' = auth.uid()::text or coalesce(record_payload->'assigneeIds', '[]'::jsonb) ? auth.uid()::text))
    or (record_kind = 'leave_request' and jsonb_path_exists(record_payload, '$.approvalSteps[*] ? (@.approverId == $viewer)', jsonb_build_object('viewer', to_jsonb(auth.uid()::text))))
  end;
$$;

drop policy if exists "employees read private CV revision" on storage.objects;
create policy "employees read private CV revision" on storage.objects for select to authenticated using (
  bucket_id = 'employee-cvs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_cv_administrator())
);

-- Extend the locked self-service RPC with all editable CV fields. Existing
-- revisions remain appended-only exactly as established in migration 0025.
create or replace function public.save_own_cv_profile(cv_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare actor uuid := auth.uid(); prior jsonb; result jsonb; revision jsonb; object_path text;
begin
  if actor is null then raise exception 'Authentication is required.'; end if;
  if length(coalesce(cv_payload->>'professionalSummary','')) > 3000 or length(coalesce(cv_payload->>'specializations','')) > 3000
    or length(coalesce(cv_payload->>'experienceHighlights','')) > 5000 or length(coalesce(cv_payload->>'educationCertifications','')) > 5000
    or length(coalesce(cv_payload->>'languages','')) > 1000 or length(coalesce(cv_payload->>'phone','')) > 120
    or length(coalesce(cv_payload->>'linkedin','')) > 500 or length(coalesce(cv_payload->>'portfolio','')) > 500 or length(coalesce(cv_payload->>'location','')) > 500
  then raise exception 'CV field is too long.'; end if;
  select payload into prior from public.company_data_documents where kind = 'cv_profile' and document_id = actor::text for update;
  result := jsonb_build_object('professionalSummary', coalesce(cv_payload->>'professionalSummary',''), 'specializations', coalesce(cv_payload->>'specializations',''), 'experienceHighlights', coalesce(cv_payload->>'experienceHighlights',''), 'educationCertifications', coalesce(cv_payload->>'educationCertifications',''), 'languages', coalesce(cv_payload->>'languages',''), 'phone', coalesce(cv_payload->>'phone',''), 'linkedin', coalesce(cv_payload->>'linkedin',''), 'portfolio', coalesce(cv_payload->>'portfolio',''), 'location', coalesce(cv_payload->>'location',''), 'revisions', coalesce(prior->'revisions', '[]'::jsonb));
  for revision in select value from jsonb_array_elements(coalesce(cv_payload->'revisions','[]'::jsonb)) loop
    object_path := nullif(revision->>'storagePath','');
    if object_path is not null and not exists (select 1 from jsonb_array_elements(coalesce(prior->'revisions','[]'::jsonb)) previous where previous->>'id' = revision->>'id') then
      if nullif(revision->>'id','') is null or object_path !~ ('^' || actor::text || '/[0-9a-f-]{36}_[^/]+$') or not exists (select 1 from storage.objects where bucket_id = 'employee-cvs' and name = object_path and owner_id = actor) then raise exception 'Invalid CV revision.'; end if;
      result := jsonb_set(result, '{revisions}', result->'revisions' || jsonb_build_array(jsonb_build_object('id', revision->>'id', 'name', left(coalesce(revision->>'name','CV.pptx'), 180), 'storagePath', object_path, 'size', coalesce((revision->>'size')::numeric, 0), 'uploadedAt', coalesce(revision->>'uploadedAt', to_char(clock_timestamp() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))));
    end if;
  end loop;
  if prior is null then insert into public.company_data_documents(kind, document_id, owner_id, payload) values ('cv_profile', actor::text, actor, result); else update public.company_data_documents set payload = result where kind = 'cv_profile' and document_id = actor::text; end if;
  return result;
end;
$$;
revoke all on function public.save_own_cv_profile(jsonb) from public;
grant execute on function public.save_own_cv_profile(jsonb) to authenticated;
