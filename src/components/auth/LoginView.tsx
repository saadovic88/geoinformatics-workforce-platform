import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { CompanyLogo } from '../common/CompanyLogo';
import { supabase } from '../../lib/supabase';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { t, language, setLanguage, isRtl } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const copy = isRtl ? {
    signIn: 'استخدم بيانات حسابك المؤسسي للمتابعة.',
    invalid: 'بيانات تسجيل الدخول غير صحيحة. تحقق من اسم المستخدم أو البريد الإلكتروني أو رمز الموظف.',
    reset: 'أدخل بريدك الإلكتروني المؤسسي لتلقي تعليمات إعادة تعيين كلمة المرور.',
    resetError: 'تعذر إرسال رابط الاستعادة. يرجى المحاولة مرة أخرى لاحقًا.',
    resetSuccess: 'إذا كان البريد مسجلًا، فسيصلك رابط الاستعادة قريبًا.',
    send: 'إرسال التعليمات', recoveryTitle: 'استعادة الوصول', recoveryClose: 'إغلاق',
  } : {
    signIn: 'Use your corporate account details to continue.',
    invalid: 'Invalid credentials. Check your username, email, or employee code.',
    reset: 'Enter your corporate email to receive password reset instructions.',
    resetError: 'Could not send the recovery link. Please try again later.',
    resetSuccess: 'If the email is registered, a recovery link will arrive shortly.',
    send: 'Send instructions', recoveryTitle: 'Recover access', recoveryClose: 'Close',
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    if (!await login(username, password)) setErrorMessage(copy.invalid);
  };
  const handleForgotSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setResetError(''); setResetBusy(true);
    try {
      if (!supabase) throw new Error('Supabase unavailable');
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setResetSuccess(true);
    } catch { setResetError(copy.resetError); } finally { setResetBusy(false); }
  };
  const openReset = () => { setForgotModal(true); setResetSuccess(false); setResetError(''); };

  return <main dir={isRtl ? 'rtl' : 'ltr'} className="login-shell relative grid min-h-[100dvh] place-items-center overflow-x-hidden px-4 py-8 text-slate-900 selection:bg-blue-700 selection:text-white sm:px-6">
    <button type="button" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="login-language-switch absolute end-4 top-4 inline-flex min-h-10 items-center gap-2 border-0 bg-transparent px-2 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 sm:end-6 sm:top-6">{language === 'en' ? 'العربية' : 'English'}</button>
    <section className="login-entry-card w-full max-w-[25rem]">
      <header className="mb-7 text-center">
        <div className="mb-6 flex justify-center"><CompanyLogo size="md" showText /></div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{t('loginTitle')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{copy.signIn}</p>
      </header>
      {errorMessage && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium leading-5 text-rose-800">{errorMessage}</div>}
      <form onSubmit={handleSubmit} className="login-form space-y-4">
        <label htmlFor="login-identity" className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{t('usernameOrEmail')}</span><span className="login-field relative block"><Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="login-identity" type="text" required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="dr.badawy or name@company.com" className="min-h-12 w-full rounded-lg border border-slate-300 bg-white py-2 ps-10 pe-3 text-base font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></span></label>
        <label htmlFor="login-password" className="block"><span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700"><span>{t('password')}</span><button type="button" onClick={openReset} className="min-h-8 text-xs font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:underline">{t('forgotPassword')}</button></span><span className="login-field relative block"><LockKeyhole className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white py-2 ps-10 pe-11 text-base font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><button type="button" aria-label={showPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')} onClick={() => setShowPassword((visible) => !visible)} className="absolute end-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500" />{t('rememberMe')}</label>
        <button type="submit" className="login-submit flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1558ad] px-4 text-sm font-bold text-white transition-colors hover:bg-[#10488f] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><span>{t('signIn')}</span><ArrowRight className={isRtl ? 'h-4 w-4 rotate-180' : 'h-4 w-4'} /></button>
      </form>
    </section>
    {forgotModal && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="login-reset-dialog w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"><div className="flex items-start justify-between gap-4"><h2 id="reset-title" className="text-lg font-bold text-slate-900">{copy.recoveryTitle}</h2><button type="button" onClick={() => setForgotModal(false)} className="min-h-9 px-2 text-sm font-semibold text-slate-600 hover:text-slate-900">{copy.recoveryClose}</button></div><p className="mt-2 text-sm leading-6 text-slate-600">{copy.reset}</p>{resetSuccess ? <div className="mt-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium leading-5 text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{copy.resetSuccess}</div> : <form onSubmit={handleForgotSubmit} className="mt-5 space-y-3"><input type="email" required autoComplete="email" placeholder="name@geoinformatics.com" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />{resetError && <p role="alert" className="text-sm font-medium text-rose-700">{resetError}</p>}<div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={() => setForgotModal(false)} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">{copy.recoveryClose}</button><button type="submit" disabled={resetBusy} className="min-h-11 rounded-lg bg-[#1558ad] px-4 text-sm font-semibold text-white hover:bg-[#10488f] disabled:opacity-50">{resetBusy ? '...' : copy.send}</button></div></form>}</div></div>}
  </main>;
};
