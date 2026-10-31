import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

export function ChangePasswordModal({ onClose, recovery = false }: { onClose: () => void; recovery?: boolean }) {
  const { currentUser } = useAuth();
  const { isRtl } = useLanguage();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!supabase) { setMessage(isRtl ? 'تغيير كلمة المرور متاح عند الاتصال بالنظام.' : 'Password changes require a connected account.'); return; }
    if (password.length < 8) { setMessage(isRtl ? 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' : 'Use at least 8 characters.'); return; }
    if (password !== confirmation) { setMessage(isRtl ? 'كلمتا المرور غير متطابقتين.' : 'The new passwords do not match.'); return; }
    setBusy(true);
    try {
      if (!recovery) {
        const { error: verificationError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: current });
        if (verificationError) { setMessage(isRtl ? 'كلمة المرور الحالية غير صحيحة أو تعذر الاتصال.' : 'Current password is incorrect or the connection failed.'); return; }
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage(isRtl ? 'تعذر تغيير كلمة المرور. تأكد من استيفاء شروط الأمان وحاول مرة أخرى.' : 'Could not change the password. Check the password security requirements and try again.'); return; }
      setSuccess(true);
      setCurrent(''); setPassword(''); setConfirmation('');
    } catch {
      setMessage(isRtl ? 'تعذر الاتصال. حاول مرة أخرى.' : 'Connection failed. Please try again.');
    } finally { setBusy(false); }
  };

  const modal = <div className="fixed inset-0 z-[200] flex min-h-[100dvh] items-start justify-center overflow-y-auto bg-slate-950/60 p-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
    <section role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="change-password-dialog my-auto w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,.72)] dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-l from-blue-50/90 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-blue-950/35 dark:via-slate-900 dark:to-slate-900 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-600 text-white shadow-sm dark:border-blue-800"><KeyRound className="h-5 w-5" /></span>
          <div>
            <h2 id="change-password-title" className="text-lg font-black text-slate-900 dark:text-white">{isRtl ? 'تغيير كلمة المرور' : 'Change password'}</h2>
            <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{recovery ? (isRtl ? 'أنشئ كلمة مرور جديدة لحسابك.' : 'Create a new password for your account.') : (isRtl ? 'استخدم كلمة قوية لحماية حسابك.' : 'Use a strong password to protect your account.')}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label={isRtl ? 'إغلاق النافذة' : 'Close dialog'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" /></button>
      </header>
      <div className="p-5 sm:p-6">
        {success ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200"><ShieldCheck className="mb-2 h-5 w-5" />{isRtl ? 'تم تغيير كلمة المرور بنجاح.' : 'Your password was changed.'}</div> : <form onSubmit={submit} className="space-y-4">
          {!recovery && <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'كلمة المرور الحالية' : 'Current password'}<input required autoComplete="current-password" type="password" value={current} onChange={e => setCurrent(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950 dark:focus:ring-blue-900" /></label>}
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'كلمة المرور الجديدة' : 'New password'}<span className="ms-1 text-xs font-medium text-slate-400">{isRtl ? '(8 أحرف على الأقل)' : '(at least 8 characters)'}</span><input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950 dark:focus:ring-blue-900" /></label>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}<input required autoComplete="new-password" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-950 dark:focus:ring-blue-900" /></label>
          {message && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold leading-5 text-rose-700 dark:border-rose-900 dark:bg-rose-950/45 dark:text-rose-200">{message}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">{isRtl ? 'إلغاء' : 'Cancel'}</button>
            <button disabled={busy} type="submit" className="min-h-11 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus:ring-blue-900">{busy ? '...' : isRtl ? 'حفظ كلمة المرور' : 'Save password'}</button>
          </div>
        </form>}
        {success && <button type="button" onClick={onClose} disabled={busy} className="mt-4 min-h-11 w-full rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">{isRtl ? 'إغلاق' : 'Close'}</button>}
      </div>
    </section>
  </div>;

  // Navbar is sticky; rendering the overlay beneath its DOM tree makes some
  // desktop browsers clip a fixed child at the header boundary. Rendering at
  // document.body gives the dialog the actual viewport and prevents the white
  // strip / cut-off form seen when changing a password.
  return createPortal(modal, document.body);
}
