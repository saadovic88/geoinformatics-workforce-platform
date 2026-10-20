import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
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
      const { error: verificationError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: current });
      if (verificationError) { setMessage(isRtl ? 'كلمة المرور الحالية غير صحيحة أو تعذر الاتصال.' : 'Current password is incorrect or the connection failed.'); return; }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage(isRtl ? 'تعذر تغيير كلمة المرور. تأكد من استيفاء شروط الأمان وحاول مرة أخرى.' : 'Could not change the password. Check the password security requirements and try again.'); return; }
      setSuccess(true);
      setCurrent(''); setPassword(''); setConfirmation('');
    } catch {
      setMessage(isRtl ? 'تعذر الاتصال. حاول مرة أخرى.' : 'Connection failed. Please try again.');
    } finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title" dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
      <h2 id="change-password-title" className="text-lg font-bold text-slate-900 dark:text-white">{isRtl ? 'تغيير كلمة المرور' : 'Change password'}</h2>
      {success ? <p role="status" className="mt-4 text-sm text-emerald-700">{isRtl ? 'تم تغيير كلمة المرور بنجاح.' : 'Your password was changed.'}</p> : <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm text-slate-700 dark:text-slate-200">{isRtl ? 'كلمة المرور الحالية' : 'Current password'}<input required autoComplete="current-password" type="password" value={current} onChange={e => setCurrent(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
        <label className="block text-sm text-slate-700 dark:text-slate-200">{isRtl ? 'كلمة المرور الجديدة (8 أحرف على الأقل)' : 'New password (at least 8 characters)'}<input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
        <label className="block text-sm text-slate-700 dark:text-slate-200">{isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}<input required autoComplete="new-password" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
        {message && <p role="alert" className="text-sm text-rose-600">{message}</p>}
        <button disabled={busy} type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? '...' : isRtl ? 'حفظ كلمة المرور' : 'Save password'}</button>
      </form>}
      <button type="button" onClick={onClose} disabled={busy} className="mt-4 text-sm font-semibold text-slate-500">{isRtl ? 'إغلاق' : 'Close'}</button>
    </div>
  </div>;
}
