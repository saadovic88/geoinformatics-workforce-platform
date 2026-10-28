import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, LockKeyhole, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { CV_TEMPLATE_PROFILES } from '../../data/cvTemplateProfiles';
import { downloadCVPdf, type CVPdfData } from '../../utils/cvPdfExport';
import { requireSupabase, supabase } from '../../lib/supabase';
import type { User } from '../../types';

type CVProfile = CVPdfData & { revisions: unknown[] };
type Field = keyof CVPdfData;
type LabelKey = 'summary' | 'skills' | 'experience' | 'education' | 'languages' | 'phone' | 'linkedin' | 'portfolio' | 'location';

const ADMIN_EMAILS = new Set(['m.badawy@geoinformatics.com', 'amr.soghayar@geoinformatics.com', 'badr.salama@geoinformatics.com']);
const fields: Array<[Field, LabelKey, boolean]> = [
  ['professionalSummary', 'summary', true], ['specializations', 'skills', true],
  ['experienceHighlights', 'experience', true], ['educationCertifications', 'education', true],
  ['languages', 'languages', false], ['phone', 'phone', false], ['linkedin', 'linkedin', false],
  ['portfolio', 'portfolio', false], ['location', 'location', false],
];
const blank = (): CVProfile => ({
  professionalSummary: '', specializations: '', experienceHighlights: '', educationCertifications: '',
  languages: '', phone: '', linkedin: '', portfolio: '', location: '', revisions: [],
});
const defaultProfile = (user: User): CVProfile => ({
  ...blank(), ...(CV_TEMPLATE_PROFILES[user.employeeCode] || {}),
  phone: CV_TEMPLATE_PROFILES[user.employeeCode]?.phone || user.phone || '',
});
const normalise = (value: unknown, user: User): CVProfile => {
  const raw = value && typeof value === 'object' ? value as Partial<CVProfile> : {};
  return { ...defaultProfile(user), ...raw, revisions: Array.isArray(raw.revisions) ? raw.revisions : [] };
};
const profileFields: Field[] = ['professionalSummary', 'specializations', 'experienceHighlights', 'educationCertifications', 'languages', 'phone', 'linkedin', 'portfolio', 'location'];
const differsFromTemplate = (profile: CVProfile, user: User) => {
  const baseline = defaultProfile(user);
  return profileFields.some((field) => profile[field].trim() !== baseline[field].trim());
};

export const MyCVView: React.FC = () => {
  const { currentUser, users } = useAuth();
  const { isRtl } = useLanguage();
  const [own, setOwn] = useState<CVProfile>(() => defaultProfile(currentUser));
  const [profiles, setProfiles] = useState<Record<string, CVProfile>>({});
  const [selectedId, setSelectedId] = useState(currentUser.id);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error?: boolean; text: string } | null>(null);
  const admin = ADMIN_EMAILS.has(currentUser.email.toLowerCase());
  const selected = users.find((user) => user.id === selectedId) || currentUser;
  const viewingOther = selectedId !== currentUser.id;
  const profile = viewingOther ? (profiles[selectedId] || defaultProfile(selected)) : own;
  const t = useMemo(() => isRtl ? {
    title: 'سيرتي الذاتية المهنية', subtitle: 'عدّل بياناتك المهنية بالتفصيل ثم نزّل سيرتك الذاتية كملف PDF.',
    managerSubtitle: 'أنت تستعرض سيرة الموظف بصلاحية قراءة فقط. لا يمكن للإدارة تعديل بياناته.',
    private: 'خاص وآمن', admin: 'إدارة السير الذاتية', choose: 'اختر موظفًا للعرض', readonly: 'للعرض فقط',
    save: 'حفظ التعديلات', pdf: 'تنزيل سيرتي PDF', employeePdf: 'تنزيل PDF الموظف', loading: 'جارٍ تحميل السيرة الذاتية…',
    saved: 'تم حفظ التعديلات بنجاح.', error: 'تعذر حفظ البيانات. حاول مجددًا.',
    summary: 'الملخص المهني', skills: 'التخصصات والمهارات', experience: 'الخبرات والإنجازات',
    education: 'التعليم والشهادات', languages: 'اللغات', phone: 'هاتف التواصل', linkedin: 'LinkedIn',
    portfolio: 'رابط الأعمال أو الملف المهني', location: 'الموقع أو المدينة',
  } : {
    title: 'My professional CV', subtitle: 'Edit your professional details and download your CV as a PDF.',
    managerSubtitle: 'You are viewing this employee CV in read-only mode. Management cannot edit employee details.',
    private: 'Private & secure', admin: 'CV administration', choose: 'Choose an employee to view', readonly: 'Read-only',
    save: 'Save changes', pdf: 'Download my PDF', employeePdf: 'Download employee PDF', loading: 'Loading CV…',
    saved: 'Your changes have been saved.', error: 'We could not save the details. Please try again.',
    summary: 'Professional summary', skills: 'Specializations & skills', experience: 'Experience & achievements',
    education: 'Education & certifications', languages: 'Languages', phone: 'Contact phone', linkedin: 'LinkedIn',
    portfolio: 'Portfolio or professional link', location: 'Location or city',
  }, [isRtl]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!supabase) {
          const saved = localStorage.getItem(`geo_cv_${currentUser.id}`);
          if (!cancelled) setOwn(normalise(saved ? JSON.parse(saved) : null, currentUser));
          return;
        }
        const { data, error } = await requireSupabase().from('company_data_documents').select('owner_id,payload').eq('kind', 'cv_profile');
        if (error) throw error;
        const next: Record<string, CVProfile> = {};
        (data || []).forEach((row) => {
          const user = users.find((item) => item.id === row.owner_id);
          if (user) next[user.id] = normalise(row.payload, user);
        });
        if (!cancelled) {
          setProfiles(next);
          setOwn(next[currentUser.id] || defaultProfile(currentUser));
        }
      } catch (error) {
        console.error('Unable to load CV', error);
        if (!cancelled) setNotice({ error: true, text: t.error });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUser.id, t.error, users]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      if (!supabase) {
        localStorage.setItem(`geo_cv_${currentUser.id}`, JSON.stringify(own));
      } else {
        const { error } = await requireSupabase().rpc('save_own_cv_profile', { cv_payload: own });
        if (error) throw error;
      }
      setProfiles((previous) => ({ ...previous, [currentUser.id]: own }));
      setNotice({ text: t.saved });
    } catch (error) {
      console.error('Unable to save CV', error);
      setNotice({ error: true, text: t.error });
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    if (CV_TEMPLATE_PROFILES[selected.employeeCode] && !differsFromTemplate(profile, selected)) {
      const link = document.createElement('a');
      link.href = `/assets/cvs/${selected.employeeCode}.pdf`;
      link.download = `${selected.employeeCode}-CV.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    downloadCVPdf(selected, profile);
  };

  if (loading) return <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500 dark:text-slate-400">{t.loading}</div>;

  return <section dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">
    <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="border-b border-blue-100 px-5 py-3 text-xs font-bold text-blue-700 dark:border-slate-700 dark:text-blue-300"><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4" />{t.private}</span></div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <img src={selected.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl border-2 border-white object-cover shadow-sm dark:border-slate-700" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black text-slate-900 dark:text-white">{viewingOther ? selected.nameEn : t.title}</h1>{viewingOther && <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-extrabold text-amber-800 dark:bg-amber-900/60 dark:text-amber-100"><LockKeyhole className="h-3.5 w-3.5" />{t.readonly}</span>}</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.jobTitleEn} · {selected.employeeCode}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{viewingOther ? t.managerSubtitle : t.subtitle}</p>
          </div>
        </div>
        <button type="button" onClick={download} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><Download className="h-4 w-4" />{viewingOther ? t.employeePdf : t.pdf}</button>
      </div>
    </header>

    {admin && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 text-amber-900 dark:text-amber-200"><ShieldCheck className="h-5 w-5" /><div><h2 className="font-black">{t.admin}</h2><p className="text-xs font-medium opacity-80">{t.readonly}</p></div></div>
        <label className="min-w-64"><span className="sr-only">{t.choose}</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-800 dark:bg-slate-900 dark:text-white">{users.filter((user) => user.status === 'active').map((user) => <option key={user.id} value={user.id}>{user.nameEn} — {user.employeeCode}</option>)}</select></label>
      </div>
    </section>}

    <main aria-readonly={viewingOther} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800"><div><h2 className="font-black text-slate-900 dark:text-white">{selected.nameEn}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{selected.email}</p></div><UserRound className="h-5 w-5 text-blue-600" /></div>
      <div className="grid gap-4">{fields.map(([field, label, multiline]) => <label key={field} className="grid gap-1.5"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{t[label]}</span>{multiline ? <textarea value={profile[field]} readOnly={viewingOther} rows={field === 'professionalSummary' ? 4 : 5} maxLength={5000} onChange={(event) => setOwn((old) => ({ ...old, [field]: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:cursor-default read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900 dark:read-only:bg-slate-800" /> : <input value={profile[field]} readOnly={viewingOther} maxLength={1000} onChange={(event) => setOwn((old) => ({ ...old, [field]: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:cursor-default read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900 dark:read-only:bg-slate-800" />}</label>)}</div>
      {!viewingOther && <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600"><Save className="h-4 w-4" />{t.save}</button>}
    </main>
    {notice && <div role="status" className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'}`}>{notice.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{notice.text}</div>}
  </section>;
};
