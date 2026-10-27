import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, ExternalLink, FileCheck2, FileText, LockKeyhole, Save, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { requireSupabase, supabase } from '../../lib/supabase';

type CVRevision = { id: string; name: string; storagePath: string; size: number; uploadedAt: string };
type CVProfile = { professionalSummary: string; specializations: string; experienceHighlights: string; educationCertifications: string; languages: string; revisions: CVRevision[] };
const EMPTY: CVProfile = { professionalSummary: '', specializations: '', experienceHighlights: '', educationCertifications: '', languages: '', revisions: [] };
const MAX_BYTES = 10 * 1024 * 1024;
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function normalise(value: unknown): CVProfile {
  const item = value && typeof value === 'object' ? value as Partial<CVProfile> : {};
  return { professionalSummary: item.professionalSummary || '', specializations: item.specializations || '', experienceHighlights: item.experienceHighlights || '', educationCertifications: item.educationCertifications || '', languages: item.languages || '', revisions: Array.isArray(item.revisions) ? item.revisions.filter((x): x is CVRevision => Boolean(x?.id && x.storagePath)) : [] };
}

export const MyCVView: React.FC = () => {
  const { currentUser } = useAuth();
  const { isRtl } = useLanguage();
  const [profile, setProfile] = useState<CVProfile>(EMPTY);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error?: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useMemo(() => isRtl ? {
    title: 'سيرتي الذاتية المهنية', sub: 'نزّل القالب المعتمد، عدّله في PowerPoint، ثم ارفع نسختك الجديدة. بياناتك وسجل الإصدارات خاصان بك.', template: 'تنزيل القالب المعتمد', upload: 'رفع نسخة PowerPoint محدثة', save: 'حفظ البيانات المهنية', private: 'خاص وآمن', workflow: 'طريقة العمل المعتمدة', workflowText: 'كل رفع ينشئ إصدارًا جديدًا ولا يحذف أي إصدار سابق. لا يمكن لموظف آخر الاطلاع على سيرتك الذاتية.', summary: 'الملخص المهني', skills: 'التخصصات والمهارات', experience: 'أبرز الخبرات والإنجازات', education: 'التعليم والشهادات', languages: 'اللغات', revisions: 'سجل النسخ المرفوعة', none: 'لم تُرفع نسخة بعد. ابدأ بتنزيل القالب المعتمد.', latest: 'أحدث نسخة', open: 'فتح آمن', help: 'ملف PowerPoint فقط (PPTX) — حتى 10 ميجابايت.', saved: 'تم حفظ بيانات سيرتك الذاتية.', uploaded: 'تم رفع وحفظ الإصدار الجديد بنجاح.', error: 'تعذر حفظ السيرة الذاتية. حاول مجددًا.', bad: 'اختر ملف PowerPoint بصيغة PPTX لا يتجاوز 10 ميجابايت.', loading: 'جارٍ تحميل سيرتك الذاتية…',
  } : {
    title: 'My professional CV', sub: 'Download the approved template, edit it in PowerPoint, then upload your new version. Your data and revision history are private.', template: 'Download approved template', upload: 'Upload updated PowerPoint', save: 'Save professional details', private: 'Private & secure', workflow: 'Approved workflow', workflowText: 'Every upload creates a new revision and never removes a prior one. Other employees cannot view your CV.', summary: 'Professional summary', skills: 'Specializations & skills', experience: 'Experience highlights', education: 'Education & certifications', languages: 'Languages', revisions: 'Uploaded revisions', none: 'No version uploaded yet. Start by downloading the approved template.', latest: 'Latest version', open: 'Securely open', help: 'PowerPoint PPTX only — up to 10 MB.', saved: 'Your CV details have been saved.', uploaded: 'Your new CV revision has been uploaded and saved.', error: 'We could not save your CV. Please try again.', bad: 'Choose a PPTX PowerPoint file no larger than 10 MB.', loading: 'Loading your CV…',
  }, [isRtl]);

  const save = async (next: CVProfile, success: string) => {
    setSaving(true); setNotice(null);
    try {
      if (!supabase) localStorage.setItem(`geo_cv_${currentUser.id}`, JSON.stringify(next));
      else { const { error } = await requireSupabase().rpc('save_own_cv_profile', { cv_payload: next }); if (error) throw error; }
      setProfile(next); setNotice({ text: success });
    } catch (error) { console.error('CV save failed', error); setNotice({ error: true, text: t.error }); throw error; }
    finally { setSaving(false); }
  };

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        if (!supabase) { const raw = localStorage.getItem(`geo_cv_${currentUser.id}`); if (!disposed && raw) setProfile(normalise(JSON.parse(raw))); return; }
        const { data, error } = await requireSupabase().from('company_data_documents').select('payload').eq('kind', 'cv_profile').eq('document_id', currentUser.id).maybeSingle();
        if (error) throw error;
        if (!disposed && data?.payload) setProfile(normalise(data.payload));
      } catch (error) { console.error('CV load failed', error); if (!disposed) setNotice({ error: true, text: t.error }); }
      finally { if (!disposed) setLoading(false); }
    };
    void load(); return () => { disposed = true; };
  }, [currentUser.id, t.error]);

  const update = (key: Exclude<keyof CVProfile, 'revisions'>, value: string) => setProfile((old) => ({ ...old, [key]: value }));
  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pptx') || file.size > MAX_BYTES || (file.type && file.type !== PPTX)) { setNotice({ error: true, text: t.bad }); return; }
    const revision: CVRevision = { id: crypto.randomUUID(), name: file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180), storagePath: '', size: file.size, uploadedAt: new Date().toISOString() };
    try {
      if (supabase) { revision.storagePath = `${currentUser.id}/${revision.id}_${revision.name}`; const { error } = await requireSupabase().storage.from('employee-cvs').upload(revision.storagePath, file, { contentType: PPTX, upsert: false }); if (error) throw error; }
      else revision.storagePath = `local/${revision.name}`;
      await save({ ...profile, revisions: [...profile.revisions, revision] }, t.uploaded);
    } catch (error) { console.error('CV upload failed', error); setNotice({ error: true, text: t.error }); }
    finally { if (inputRef.current) inputRef.current.value = ''; }
  };
  const open = async (revision: CVRevision) => {
    if (!supabase || revision.storagePath.startsWith('local/')) return;
    const { data, error } = await requireSupabase().storage.from('employee-cvs').createSignedUrl(revision.storagePath, 60);
    if (error || !data?.signedUrl) { setNotice({ error: true, text: t.error }); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };
  const fields: Array<[Exclude<keyof CVProfile, 'revisions'>, string, boolean]> = [['professionalSummary', t.summary, true], ['specializations', t.skills, false], ['experienceHighlights', t.experience, true], ['educationCertifications', t.education, true], ['languages', t.languages, false]];
  if (loading) return <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500 dark:text-slate-400">{t.loading}</div>;
  return <section dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">
    <header className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300"><FileText className="h-5 w-5" /><span className="text-xs font-extrabold uppercase tracking-wider">{t.private}</span></div><h1 className="text-2xl font-black text-slate-900 dark:text-white">{t.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t.sub}</p></div><a href="/assets/templates/Geoinformatics-Approved-CV-Template.pptx" download className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><Download className="h-4 w-4" />{t.template}</a></div></header>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <form onSubmit={(event) => { event.preventDefault(); void save(profile, t.saved); }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"><div className="grid gap-4">{fields.map(([key, label, multiline]) => <label key={key} className="grid gap-1.5"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</span>{multiline ? <textarea value={profile[key]} maxLength={3000} rows={4} onChange={(event) => update(key, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900" /> : <input value={profile[key]} maxLength={1000} onChange={(event) => update(key, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900" />}</label>)}</div><button disabled={saving} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600"><Save className="h-4 w-4" />{t.save}</button></form>
      <aside className="space-y-5"><div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30"><div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300"><LockKeyhole className="h-5 w-5" /><h2 className="font-extrabold">{t.workflow}</h2></div><p className="mt-2 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">{t.workflowText}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="font-extrabold text-slate-900 dark:text-white">{t.revisions}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.help}</p><input ref={inputRef} onChange={(event) => void upload(event.target.files?.[0])} accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" type="file" className="sr-only" /><button type="button" disabled={saving} onClick={() => inputRef.current?.click()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200"><Upload className="h-4 w-4" />{t.upload}</button><div className="mt-4 space-y-2">{profile.revisions.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t.none}</p> : [...profile.revisions].reverse().map((revision, index) => <div key={revision.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"><div className="flex gap-2"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{revision.name}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(revision.uploadedAt))} · {(revision.size / 1024 / 1024).toFixed(1)} MB</p></div></div>{index === 0 && <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">{t.latest}</span>}<button type="button" onClick={() => void open(revision)} className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-300"><ExternalLink className="h-3.5 w-3.5" />{t.open}</button></div>)}</div></div></aside>
    </div>
    {notice && <div role="status" className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'}`}>{notice.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{notice.text}</div>}
  </section>;
};
