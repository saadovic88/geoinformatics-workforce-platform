import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, LockKeyhole, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { CV_TEMPLATE_PROFILES } from '../../data/cvTemplateProfiles';
import { downloadCVPdf, type CVPdfData } from '../../utils/cvPdfExport';
import { requireSupabase, supabase } from '../../lib/supabase';
import type { User } from '../../types';

type CVRevision = { id: string; name: string; storagePath: string; size: number; uploadedAt: string };
type CVProfile = CVPdfData & { revisions: CVRevision[] };
type Field = keyof CVPdfData;
const empty = (): CVProfile => ({ professionalSummary: '', specializations: '', experienceHighlights: '', educationCertifications: '', languages: '', phone: '', linkedin: '', portfolio: '', location: '', revisions: [] });
const formFields: Array<[Field, string, boolean]> = [['professionalSummary', 'summary', true], ['specializations', 'skills', true], ['experienceHighlights', 'experience', true], ['educationCertifications', 'education', true], ['languages', 'languages', false], ['phone', 'phone', false], ['linkedin', 'linkedin', false], ['portfolio', 'portfolio', false], ['location', 'location', false]];
const adminEmails = new Set(['m.badawy@geoinformatics.com', 'amr.soghayar@geoinformatics.com', 'badr.salama@geoinformatics.com']);

function defaultProfile(user: User): CVProfile {
  const seeded = CV_TEMPLATE_PROFILES[user.employeeCode] || {};
  return { ...empty(), ...seeded, phone: seeded.phone || user.phone || '' };
}
function readProfile(value: unknown, user: User): CVProfile {
  const data = value && typeof value === 'object' ? value as Partial<CVProfile> : {};
  return { ...defaultProfile(user), ...data, revisions: Array.isArray(data.revisions) ? data.revisions as CVRevision[] : [] };
}

export const MyCVView: React.FC = () => {
  const { currentUser, users } = useAuth();
  const { isRtl } = useLanguage();
  const [own, setOwn] = useState<CVProfile>(() => defaultProfile(currentUser));
  const [profiles, setProfiles] = useState<Record<string, CVProfile>>({});
  const [selectedId, setSelectedId] = useState(currentUser.id);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error?: boolean; text: string } | null>(null);
  const admin = adminEmails.has(currentUser.email.toLowerCase());
  const selected = users.find((item) => item.id === selectedId) || currentUser;
  const viewed = selectedId === currentUser.id ? own : (profiles[selectedId] || defaultProfile(selected));
  const t = useMemo(() => isRtl ? {
    title: 'Ø³ÙŠØ±ØªÙŠ Ø§Ù„Ø°Ø§ØªÙŠØ© Ø§Ù„Ù…Ù‡Ù†ÙŠØ©', sub: 'Ø¹Ø¯Ù‘Ù„ ØªÙØ§ØµÙŠÙ„ Ø³ÙŠØ±ØªÙƒØŒ Ø«Ù… Ù†Ø²Ù‘Ù„ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙƒÙ…Ù„Ù PDF.', managerSub: 'Ø±Ø§Ø¬Ø¹ Ø§Ù„Ø³ÙŠØ±Ø© Ø§Ù„Ø°Ø§ØªÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ù„Ù„Ù…ÙˆØ¸Ù ÙˆÙ†Ø²Ù‘Ù„ Ù…Ù„Ù PDF. Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ù…ØªØ§Ø­ Ù„ØµØ§Ø­Ø¨ Ø§Ù„Ø³ÙŠØ±Ø© ÙÙ‚Ø·.', private: 'Ø®Ø§Øµ ÙˆØ¢Ù…Ù†', admin: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø³ÙŠØ± Ø§Ù„Ø°Ø§ØªÙŠØ©', choose: 'Ø§Ø®ØªØ± Ù…ÙˆØ¸ÙÙ‹Ø§ Ù„Ù„Ø¹Ø±Ø¶', readonly: 'Ø¹Ø±Ø¶ ÙÙ‚Ø· Ù„Ù„Ø¥Ø¯Ø§Ø±Ø©', save: 'Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª', pdf: 'ØªÙ†Ø²ÙŠÙ„ Ø³ÙŠØ±ØªÙŠ PDF', selectedPdf: 'ØªÙ†Ø²ÙŠÙ„ PDF Ù„Ù„Ù…ÙˆØ¸Ù', loading: 'Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø³ÙŠØ±Ø© Ø§Ù„Ø°Ø§ØªÙŠØ©â€¦', saved: 'ØªÙ… Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø¨Ù†Ø¬Ø§Ø­.', error: 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª. Ø­Ø§ÙˆÙ„ Ù…Ø¬Ø¯Ø¯Ù‹Ø§.', summary: 'Ø§Ù„Ù…Ù„Ø®Øµ Ø§Ù„Ù…Ù‡Ù†ÙŠ', skills: 'Ø§Ù„ØªØ®ØµØµØ§Øª ÙˆØ§Ù„Ù…Ù‡Ø§Ø±Ø§Øª', experience: 'Ø§Ù„Ø®Ø¨Ø±Ø§Øª ÙˆØ§Ù„Ø¥Ù†Ø¬Ø§Ø²Ø§Øª', education: 'Ø§Ù„ØªØ¹Ù„ÙŠÙ… ÙˆØ§Ù„Ø´Ù‡Ø§Ø¯Ø§Øª', languages: 'Ø§Ù„Ù„ØºØ§Øª', phone: 'Ù‡Ø§ØªÙ Ø§Ù„ØªÙˆØ§ØµÙ„', linkedin: 'LinkedIn', portfolio: 'Ø±Ø§Ø¨Ø· Ø§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø£Ùˆ Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…Ù‡Ù†ÙŠ', location: 'Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø£Ùˆ Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©', privacy: 'Ù„Ø§ ÙŠØ³ØªØ·ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¸ÙÙˆÙ† Ø±Ø¤ÙŠØ© Ø³ÙŠØ± Ø¨Ø¹Ø¶Ù‡Ù…. Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø®ÙˆÙ‘Ù„Ø© ØªØ³ØªØ·ÙŠØ¹ Ø§Ù„Ø¹Ø±Ø¶ ÙÙ‚Ø·ØŒ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ†Ù‡Ø§ ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ¸Ù.', source: 'ØªÙ…Øª ØªØ¹Ø¨Ø¦Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØ§Ø­Ø© ÙÙ‚Ø· Ù…Ù† Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ù…Ø±Ø³Ù„. ÙŠÙ…ÙƒÙ† Ù„ØµØ§Ø­Ø¨ Ø§Ù„Ø³ÙŠØ±Ø© Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ø£ÙŠ Ø­Ù‚Ù„ ÙØ§Ø±Øº.', noCv: 'Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙØ§ØµÙŠÙ„ Ø¥Ø¶Ø§ÙÙŠØ© Ø¨Ø¹Ø¯Ø› ØªØ¸Ù‡Ø± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù‡ÙˆÙŠØ© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© ÙÙ‚Ø·.'
  } : {
    title: 'My professional CV', sub: 'Edit your details, then download your current CV as a PDF.', managerSub: 'Review this employeeâ€™s current CV and download its PDF. Changes remain available only to the employee.', private: 'Private & secure', admin: 'CV administration', choose: 'Choose an employee to view', readonly: 'Management read-only view', save: 'Save changes', pdf: 'Download my PDF', selectedPdf: 'Download employee PDF', loading: 'Loading CVâ€¦', saved: 'Your changes have been saved.', error: 'We could not save the details. Please try again.', summary: 'Professional summary', skills: 'Specializations & skills', experience: 'Experience & achievements', education: 'Education & certifications', languages: 'Languages', phone: 'Contact phone', linkedin: 'LinkedIn', portfolio: 'Portfolio or professional link', location: 'Location or city', privacy: 'Employees cannot view one anotherâ€™s CVs. Authorised management can view only and cannot edit employee details.', source: 'Only information available in the supplied template has been prefilled. The employee can complete any blank field.', noCv: 'No additional details entered yet; only platform identity is shown.'
  }, [isRtl]);
  const viewingOtherEmployee = selectedId !== currentUser.id;

  useEffect(() => {
    let done = false;
    const load = async () => {
      try {
        if (!supabase) { const raw = localStorage.getItem(`geo_cv_${currentUser.id}`); if (!done) setOwn(readProfile(raw ? JSON.parse(raw) : null, currentUser)); return; }
        const { data, error } = await requireSupabase().from('company_data_documents').select('owner_id,payload').eq('kind', 'cv_profile');
        if (error) throw error;
        const next: Record<string, CVProfile> = {};
        (data || []).forEach((row) => { const employee = users.find((item) => item.id === row.owner_id); if (employee) next[employee.id] = readProfile(row.payload, employee); });
        if (!done) { setProfiles(next); setOwn(next[currentUser.id] || defaultProfile(currentUser)); }
      } catch (error) { console.error('CV load failed', error); if (!done) setNotice({ error: true, text: t.error }); }
      finally { if (!done) setLoading(false); }
    };
    void load(); return () => { done = true; };
  }, [currentUser, users, t.error]);

  const save = async () => {
    setSaving(true); setNotice(null);
    try {
      if (!supabase) localStorage.setItem(`geo_cv_${currentUser.id}`, JSON.stringify(own));
      else { const { error } = await requireSupabase().rpc('save_own_cv_profile', { cv_payload: own }); if (error) throw error; }
      setProfiles((previous) => ({ ...previous, [currentUser.id]: own })); setNotice({ text: t.saved });
    } catch (error) { console.error('CV save failed', error); setNotice({ error: true, text: t.error }); }
    finally { setSaving(false); }
  };
  const setField = (field: Field, value: string) => setOwn((previous) => ({ ...previous, [field]: value }));
  if (loading) return <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500 dark:text-slate-400">{t.loading}</div>;
  return <section dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">
    <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"><div className="border-b border-blue-100 px-5 py-3 text-xs font-bold text-blue-700 dark:border-slate-700 dark:text-blue-300"><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4" />{t.private}</span></div><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div className="flex items-center gap-4"><img src={selected.avatarUrl} alt="" className="h-14 w-14 rounded-2xl border-2 border-white object-cover shadow-sm dark:border-slate-700" /><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">{selectedId === currentUser.id ? t.title : selected.nameEn}{viewingOtherEmployee && <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 align-middle text-xs font-extrabold text-amber-800 dark:bg-amber-900/60 dark:text-amber-100"><LockKeyhole className="h-3.5 w-3.5" />{t.readonly}</span>}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.jobTitleEn} Â· {selected.employeeCode}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{viewingOtherEmployee ? t.managerSub : t.sub}</p></div></div><button type="button" onClick={() => downloadCVPdf(selected, viewed)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><Download className="h-4 w-4" />{selectedId === currentUser.id ? t.pdf : t.selectedPdf}</button></div></header>
    {admin && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/70 dark:bg-amber-950/30"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex flex-1 items-center gap-2 text-amber-900 dark:text-amber-200"><ShieldCheck className="h-5 w-5" /><div><h2 className="font-black">{t.admin}</h2><p className="text-xs font-medium opacity-80">{t.readonly}</p></div></div><label className="min-w-64"><span className="sr-only">{t.choose}</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-800 dark:bg-slate-900 dark:text-white">{users.filter((user) => user.status === 'active').map((user) => <option key={user.id} value={user.id}>{user.nameEn} â€” {user.employeeCode}</option>)}</select></label></div></section>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><main aria-readonly={viewingOtherEmployee} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"><div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800"><div><h2 className="font-black text-slate-900 dark:text-white">{selected.nameEn}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{selected.email}</p></div><UserRound className="h-5 w-5 text-blue-600" /></div><div className="grid gap-4">{formFields.map(([key, label, multiline]) => <label key={key} className="grid gap-1.5"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{t[label as keyof typeof t]}</span>{multiline ? <textarea value={viewed[key]} readOnly={selectedId !== currentUser.id} rows={key === 'professionalSummary' ? 4 : 5} maxLength={3000} onChange={(event) => setField(key, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:cursor-default read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:read-only:bg-slate-800" /> : <input value={viewed[key]} readOnly={selectedId !== currentUser.id} maxLength={1000} onChange={(event) => setField(key, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:cursor-default read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:read-only:bg-slate-800" />}</label>)}</div>{selectedId === currentUser.id && <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600"><Save className="h-4 w-4" />{t.save}</button>}</main><aside className="space-y-4"><div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30"><h2 className="font-extrabold text-emerald-900 dark:text-emerald-200">{t.private}</h2><p className="mt-2 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">{t.privacy}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/60 dark:bg-blue-950/30"><FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" /><p className="mt-2 text-sm leading-6 text-blue-950/80 dark:text-blue-100/80">{t.source}</p></div>{!viewed.professionalSummary && !viewed.specializations && <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t.noCv}</p>}</aside></div>
    {notice && <div role="status" className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'}`}>{notice.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{notice.text}</div>}
  </section>;
};
