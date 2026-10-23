import React, { useEffect, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, Info, MapPin, Save, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type Settings = {
  companyNameEn: string;
  companyNameAr: string;
  defaultHours: number;
  defaultRadius: number;
  leaveApprovalEnabled: boolean;
  wfhEnabled: boolean;
};

const defaults: Settings = {
  companyNameEn: 'Geoinformatics GIS & Remote Sensing',
  companyNameAr: 'جيوانفورماتكس لنظم المعلومات الجغرافية والاستشعار عن بعد',
  defaultHours: 8,
  defaultRadius: 500,
  leaveApprovalEnabled: true,
  wfhEnabled: true,
};

export const CompanySettingsView: React.FC = () => {
  const { isRtl } = useLanguage();
  const { currentUser, isFullAccessUser } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [notice, setNotice] = useState<'saved' | 'error' | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return;
    void supabase.from('company_data_documents').select('payload')
      .eq('kind', 'company_setting').eq('document_id', 'platform').maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.payload) setSettings({ ...defaults, ...(data.payload as Partial<Settings>) });
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((previous) => ({ ...previous, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFullAccessUser) return;
    if (!settings.companyNameEn.trim() || settings.defaultHours < 1 || settings.defaultHours > 24 || settings.defaultRadius < 50 || settings.defaultRadius > 10000 || !supabase) {
      setNotice('error');
      return;
    }
    const { error } = await supabase.from('company_data_documents').upsert({
      kind: 'company_setting', document_id: 'platform', owner_id: currentUser.id, payload: settings,
    }, { onConflict: 'kind,document_id' });
    setNotice(error ? 'error' : 'saved');
    window.setTimeout(() => setNotice(null), 3500);
  };

  const text = isRtl ? {
    title: 'إعدادات الشركة', subtitle: 'سياسات تشغيل مركزية محفوظة في قاعدة بيانات الشركة وتظهر على جميع الأجهزة.',
    readOnly: 'وضع القراءة فقط. يمكن للمسؤولين المعتمدين فقط تعديل هذه السياسات.', saved: 'تم حفظ إعدادات الشركة مركزياً بنجاح.',
    error: 'تعذر الحفظ. راجع الاتصال والقيم ثم حاول مرة أخرى.', identity: 'هوية المؤسسة', attendance: 'الحضور والسياج الجغرافي',
    governance: 'الحوكمة والاستثناءات', nameEn: 'اسم المؤسسة بالإنجليزية', nameAr: 'اسم المؤسسة بالعربية',
    hours: 'ساعات العمل القياسية يومياً', radius: 'نطاق التحقق الجغرافي (متر)', leave: 'تفعيل مسار اعتماد الإجازات',
    remote: 'السماح باستثناءات العمل عن بعد والمواقع الميدانية', save: 'حفظ الإعدادات', loading: 'جارٍ تحميل الإعدادات المركزية…',
    history: 'تُطبق القيم المحفوظة على القرارات الجديدة، ولا تغيّر سجلات الحضور السابقة.',
  } : {
    title: 'Company settings', subtitle: 'Central operating policies saved in the company database and shared across every device.',
    readOnly: 'Read-only access. Only authorized administrators can change these policies.', saved: 'Company settings were saved centrally.',
    error: 'Could not save. Check the connection and values, then try again.', identity: 'Organization identity', attendance: 'Attendance & geofence',
    governance: 'Governance & exceptions', nameEn: 'Organization name (English)', nameAr: 'Organization name (Arabic)',
    hours: 'Standard daily work hours', radius: 'Geofence validation radius (meters)', leave: 'Enable the leave approval workflow',
    remote: 'Allow remote and field-site exceptions', save: 'Save settings', loading: 'Loading central settings…',
    history: 'Saved values apply to new decisions and do not rewrite historical attendance records.',
  };

  return <div className="space-y-6">
    <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-blue-400/20" />
      <div className="relative flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/20 text-blue-200"><Building2 className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Platform governance</p><h1 className="mt-1 text-xl font-bold">{text.title}</h1><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">{text.subtitle}</p></div></div>
    </header>
    {!isFullAccessUser && <Notice icon={<AlertCircle className="h-4 w-4" />} tone="amber">{text.readOnly}</Notice>}
    {notice && <Notice icon={notice === 'saved' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} tone={notice === 'saved' ? 'emerald' : 'rose'}>{notice === 'saved' ? text.saved : text.error}</Notice>}
    {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{text.loading}</div> :
      <form onSubmit={save} className="space-y-5">
        <Panel icon={<Building2 className="h-4 w-4" />} title={text.identity}><div className="grid gap-4 md:grid-cols-2"><Field label={text.nameEn} value={settings.companyNameEn} disabled={!isFullAccessUser} onChange={(value) => update('companyNameEn', value)} /><Field label={text.nameAr} value={settings.companyNameAr} disabled={!isFullAccessUser} onChange={(value) => update('companyNameAr', value)} /></div></Panel>
        <Panel icon={<MapPin className="h-4 w-4" />} title={text.attendance}><div className="grid gap-4 md:grid-cols-2"><Field type="number" label={text.hours} value={settings.defaultHours} disabled={!isFullAccessUser} onChange={(value) => update('defaultHours', Number(value))} /><Field type="number" label={text.radius} value={settings.defaultRadius} disabled={!isFullAccessUser} onChange={(value) => update('defaultRadius', Number(value))} /></div><div className="mt-5 flex gap-2 rounded-xl bg-blue-50 p-3 text-[11px] text-blue-800"><Info className="h-4 w-4 shrink-0" />{text.history}</div></Panel>
        <Panel icon={<ShieldCheck className="h-4 w-4" />} title={text.governance}><div className="grid gap-3 md:grid-cols-2"><Toggle label={text.leave} checked={settings.leaveApprovalEnabled} disabled={!isFullAccessUser} onChange={(value) => update('leaveApprovalEnabled', value)} /><Toggle label={text.remote} checked={settings.wfhEnabled} disabled={!isFullAccessUser} onChange={(value) => update('wfhEnabled', value)} /></div></Panel>
        {isFullAccessUser && <div className="flex justify-end"><button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><Save className="h-4 w-4" />{text.save}</button></div>}
      </form>}
  </div>;
};

const Notice = ({ children, icon, tone }: { children: React.ReactNode; icon: React.ReactNode; tone: 'amber' | 'emerald' | 'rose' }) => <div className={`flex gap-2 rounded-xl border p-3 text-xs ${tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{icon}{children}</div>;
const Panel = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-900"><span className="text-blue-600">{icon}</span>{title}</div><div className="p-5">{children}</div></section>;
const Field = ({ label, value, onChange, disabled, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; disabled: boolean; type?: string }) => <label className="block text-xs font-semibold text-slate-700">{label}<input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100" /></label>;
const Toggle = ({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) => <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-800 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-65">{label}<input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-blue-600" /></label>;
