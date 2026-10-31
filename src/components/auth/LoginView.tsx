import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Globe2, LockKeyhole, Mail, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
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
    platform: 'منصة إدارة القوى العاملة', welcome: 'مساحة عمل دقيقة، لكل يوم عمل.',
    brand: 'بيئة تشغيل موحّدة للحضور والمهام والأداء.',
    body: 'تابع حضورك ومهامك وطلباتك في مكان واحد متصل بفرق الشركة.',
    secure: 'اتصال الشركة محمي', signIn: 'استخدم بيانات حسابك المؤسسي للمتابعة.',
    invalid: 'بيانات الدخول غير صحيحة. تحقق من اسم المستخدم أو البريد أو كود الموظف.',
    reset: 'أدخل بريدك المؤسسي لإرسال تعليمات إعادة تعيين كلمة المرور.',
    resetError: 'تعذر إرسال رابط الاستعادة. حاول مرة أخرى لاحقًا.',
    resetSuccess: 'إذا كان البريد مسجلاً، سيصلك رابط الاستعادة قريبًا.',
    send: 'إرسال التعليمات', footer: 'دخول مؤسسي مُدار لفِرَق جيوإنفورماتيكس',
  } : {
    platform: 'Workforce operations platform', welcome: 'A precise workspace for every working day.',
    brand: 'One connected workspace for attendance, work and performance.',
    body: 'Track attendance, assignments and requests in one connected company environment.',
    secure: 'Company connection secured', signIn: 'Use your corporate account details to continue.',
    invalid: 'Invalid credentials. Check your username, email, or employee code.',
    reset: 'Enter your corporate email to receive password reset instructions.',
    resetError: 'Could not send the recovery link. Please try again later.',
    resetSuccess: 'If the email is registered, a recovery link will arrive shortly.',
    send: 'Send instructions', footer: 'Managed company access for Geoinformatics teams',
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

  return <main dir={isRtl ? 'rtl' : 'ltr'} className="login-shell relative grid min-h-[100dvh] place-items-center overflow-x-hidden bg-slate-100 p-3 text-slate-900 selection:bg-blue-700 selection:text-white sm:p-6">
    <div aria-hidden="true" className="absolute inset-0 login-grid-texture" />
    <div aria-hidden="true" className="login-noise" />
    <div aria-hidden="true" className="login-horizon" />
    <div aria-hidden="true" className="login-orbit login-orbit-one" />
    <div aria-hidden="true" className="login-orbit login-orbit-two" />
    <button type="button" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="login-language-switch absolute end-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur transition hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:end-6 sm:top-6"><Globe2 className="h-4 w-4 text-blue-600" />{language === 'en' ? 'العربية' : 'English'}</button>
    <section className="login-entry-card relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_30px_80px_-34px_rgba(15,41,77,.4)] lg:min-h-[40rem] lg:grid-cols-[1.03fr_.97fr]">
      <aside className="login-command-panel relative hidden overflow-hidden bg-[#0c2547] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute inset-0 login-brand-grid opacity-80" />
        <div aria-hidden="true" className="login-route-line login-route-line-one" />
        <div aria-hidden="true" className="login-route-line login-route-line-two" />
        <div aria-hidden="true" className="absolute -end-28 top-20 h-72 w-72 rounded-full border border-sky-300/25" />
        <div aria-hidden="true" className="absolute -start-24 bottom-[-4rem] h-80 w-80 rounded-full border border-blue-300/20" />
        <div className="relative"><CompanyLogo size="lg" showText textClassName="text-white [&_span.font-black]:text-white [&_span.text-blue-600]:text-sky-300" /><div className="mt-10 max-w-md"><p className="login-panel-kicker text-xs font-bold uppercase tracking-[.18em] text-sky-200"><Sparkles className="h-3.5 w-3.5" />{copy.platform}</p><h1 className="mt-4 text-4xl font-black leading-[1.12] tracking-tight">{copy.welcome}</h1><p className="mt-5 text-sm leading-7 text-slate-300">{copy.body}</p></div></div>
        <div className="relative border-t border-white/15 pt-6"><div className="flex items-center gap-3 text-sm text-slate-200"><span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-300"><ShieldCheck className="h-4 w-4" /></span>{copy.secure}</div><p className="mt-4 text-xs leading-6 text-slate-400">{copy.brand}</p></div>
      </aside>
      <div className="login-credential-panel flex min-w-0 flex-col p-5 sm:p-8 lg:p-10">
        <div className="mb-8 flex items-center justify-between gap-4 lg:hidden"><CompanyLogo size="md" showText /><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.12)]" /></div>
        <div className="mb-7"><div className="login-brand-chip mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.13em] text-blue-700"><span className="login-status-dot h-1.5 w-1.5 rounded-full bg-blue-600" />GEOINFORMATICS</div><h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{t('loginTitle')}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{copy.signIn}</p></div>
        {errorMessage && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-semibold leading-5 text-rose-800"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />{errorMessage}</div>}
        <form onSubmit={handleSubmit} className="login-form space-y-4">
          <label htmlFor="login-identity" className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">{t('usernameOrEmail')}</span><span className="login-field relative block"><Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="login-identity" type="text" required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="dr.badawy or name@company.com" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 ps-10 pe-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></span></label>
          <label htmlFor="login-password" className="block"><span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-700"><span>{t('password')}</span><button type="button" onClick={openReset} className="min-h-8 text-xs font-bold text-blue-700 hover:text-blue-900 focus:outline-none focus:underline">{t('forgotPassword')}</button></span><span className="login-field relative block"><LockKeyhole className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 ps-10 pe-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /><button type="button" aria-label={showPassword ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')} onClick={() => setShowPassword((visible) => !visible)} className="absolute end-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500" />{t('rememberMe')}</label>
          <button type="submit" className="login-submit group relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#1558ad] px-4 text-sm font-extrabold text-white shadow-[0_14px_24px_-13px_rgba(21,88,173,.95)] transition hover:-translate-y-px hover:bg-[#10488f] focus:outline-none focus:ring-4 focus:ring-blue-200"><span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/20 transition-transform duration-700 group-hover:translate-x-[480%]" /><span className="relative">{t('signIn')}</span><ArrowRight className={isRtl ? 'relative h-4 w-4 rotate-180' : 'relative h-4 w-4'} /></button>
        </form>
        <footer className="mt-auto pt-8 text-center text-xs leading-5 text-slate-500"><span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-blue-600" />{copy.footer}</span></footer>
      </div>
    </section>
    {forgotModal && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Mail className="h-5 w-5" /></div><h3 id="reset-title" className="mt-4 text-lg font-extrabold text-slate-900">{t('resetPassword')}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{copy.reset}</p>{resetSuccess ? <div className="mt-5 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{copy.resetSuccess}</div> : <form onSubmit={handleForgotSubmit} className="mt-5 space-y-3"><input type="email" required autoComplete="email" placeholder="name@geoinformatics.com" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />{resetError && <p role="alert" className="text-xs font-semibold text-rose-700">{resetError}</p>}<div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={() => setForgotModal(false)} className="min-h-11 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-100">{t('cancel')}</button><button type="submit" disabled={resetBusy} className="min-h-11 rounded-xl bg-[#1558ad] px-4 text-xs font-bold text-white hover:bg-[#10488f] disabled:opacity-50">{resetBusy ? '...' : copy.send}</button></div></form>}</div></div>}
  </main>;
};
