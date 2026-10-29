import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { User } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { COMPANY_TIME_ZONE } from '../../utils/companyDate';

interface WelcomeOverlayProps {
  user: User;
  onContinue: () => void;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const WELCOME_DURATION = 7000;
const companyTime = () => new Intl.DateTimeFormat('en-GB', { timeZone: COMPANY_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

/** A short, accessible post-authentication hand-off into the employee workspace. */
export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ user, onContinue }) => {
  const { isRtl } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const reducedMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  const duration = reducedMotion ? 2200 : WELCOME_DURATION;
  const name = isRtl ? user.nameAr : user.nameEn;
  const title = isRtl ? user.jobTitleAr : user.jobTitleEn;
  const department = isRtl
    ? user.departmentId === 'gis' ? 'قسم نظم المعلومات الجغرافية' : user.departmentId === 'remote_sensing' ? 'قسم الاستشعار عن بُعد' : user.departmentId === 'training' ? 'قسم التدريب' : user.departmentId === 'administrative' ? 'القسم الإداري' : 'القسم الفني'
    : user.departmentId.replace(/_/g, ' ');
  const phase = reducedMotion ? 3 : elapsed < 1200 ? 1 : elapsed < 3200 ? 2 : elapsed < 6400 ? 3 : 4;
  const progress = Math.min(100, Math.round((elapsed / duration) * 100));

  useEffect(() => {
    const startedAt = performance.now();
    const interval = window.setInterval(() => setElapsed(Math.min(duration, Math.round(performance.now() - startedAt))), 100);
    const timer = window.setTimeout(onContinue, duration);
    return () => { window.clearInterval(interval); window.clearTimeout(timer); };
  }, [duration, onContinue]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.focus({ preventScroll: true });
    const siblingStates = Array.from(dialog.parentElement?.children ?? [])
      .filter((element) => element !== dialog)
      .map((element) => ({ element, hadInert: element.hasAttribute('inert'), previousAriaHidden: element.getAttribute('aria-hidden') }));
    siblingStates.forEach(({ element }) => { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true'); });
    return () => siblingStates.forEach(({ element, hadInert, previousAriaHidden }) => {
      if (!hadInert) element.removeAttribute('inert');
      if (previousAriaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', previousAriaHidden);
    });
  }, []);

  const stageCopy = isRtl
    ? phase === 1 ? 'تم تأمين الاتصال بحسابك' : phase === 2 ? 'مرحبًا بك في مساحة عملك' : phase === 3 ? 'يتم إعداد ملخص يومك' : 'مساحة العمل جاهزة'
    : phase === 1 ? 'Your company connection is secured' : phase === 2 ? 'Welcome to your workspace' : phase === 3 ? 'Preparing your day at a glance' : 'Workspace ready';

  return (
    <section ref={dialogRef} tabIndex={-1} dir={isRtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-label={isRtl ? 'رسالة ترحيب' : 'Welcome'} className={'welcome-portal welcome-phase-' + phase + ' fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#06182d] px-4 py-5 text-white sm:px-7'}>
      <div aria-hidden="true" className="absolute inset-0 welcome-grid opacity-75" />
      <div aria-hidden="true" className="welcome-horizon absolute inset-x-0 top-0 h-[54%]" />
      <div aria-hidden="true" className="welcome-contour welcome-contour--one absolute -start-24 top-[18%] h-72 w-72 rounded-full border border-cyan-300/20" />
      <div aria-hidden="true" className="welcome-contour welcome-contour--two absolute -end-36 bottom-[-5rem] h-96 w-96 rounded-full border border-blue-300/20" />
      <div aria-hidden="true" className="welcome-beacon absolute start-[18%] top-[23%] h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_0_7px_rgba(103,232,249,.12),0_0_26px_rgba(103,232,249,.85)]" />
      <button type="button" onClick={onContinue} className="absolute end-4 top-4 z-20 inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/[.06] px-3 text-xs font-bold text-slate-100 transition hover:bg-white/[.12] focus:outline-none focus:ring-2 focus:ring-cyan-300 sm:end-6 sm:top-6">{isRtl ? 'تخطي' : 'Skip'}</button>

      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/[.08] text-cyan-100 shadow-[0_18px_50px_rgba(0,0,0,.25)] backdrop-blur"><ShieldCheck className="h-7 w-7" /></div>
        <div className="welcome-avatar-wrap relative mx-auto grid h-32 w-32 place-items-center sm:h-36 sm:w-36">
          <span aria-hidden="true" className="welcome-radar-ring absolute inset-0 rounded-full border border-cyan-200/45" />
          <span aria-hidden="true" className="welcome-radar-ring welcome-radar-ring--outer absolute -inset-4 rounded-full border border-dashed border-blue-300/30" />
          <span aria-hidden="true" className="welcome-radar-dot absolute -top-1 start-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.95)]" />
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-[#e7f3ff] bg-gradient-to-br from-blue-200 to-cyan-100 shadow-[0_16px_40px_rgba(0,0,0,.34)] sm:h-28 sm:w-28">
            {user.avatarUrl && !imageFailed ? <img src={user.avatarUrl} alt="" onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-2xl font-black text-[#153b6d]">{initials(name)}</span>}
          </div>
        </div>
        <div className="welcome-copy mt-7 min-h-[8.5rem]">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200/85">{isRtl ? 'بوابة العمليات جاهزة' : 'Operations gateway ready'}</p>
          <h1 className="welcome-greeting mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{isRtl ? 'مرحبًا، ' + name : 'Welcome, ' + name}</h1>
          <p className="mt-3 text-sm font-semibold text-slate-200">{title}</p><p className="mt-1 text-xs text-slate-400">{user.employeeCode}</p>
        </div>
        <div className="welcome-insight mx-auto mt-4 grid max-w-md grid-cols-1 gap-2 text-start sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[.06] px-3 py-2.5 backdrop-blur-sm"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-300" />{isRtl ? 'مساحة العمل' : 'Workspace'}</span><p className="mt-1 text-xs font-bold text-slate-100">{department}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.06] px-3 py-2.5 backdrop-blur-sm"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Clock3 className="h-3.5 w-3.5 text-cyan-300" />{isRtl ? 'توقيت القاهرة' : 'Cairo time'}</span><p className="mt-1 text-xs font-bold text-slate-100">{companyTime()}</p></div>
        </div>
        <div className="mx-auto mt-5 max-w-md rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-start shadow-sm backdrop-blur-sm"><div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-100"><span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-300" />{stageCopy}</span><span className="tabular-nums text-cyan-200">{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="welcome-progress block h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-blue-500" style={{ width: progress + '%' }} /></div></div>
        <button type="button" onClick={onContinue} className="mt-6 inline-flex min-h-11 items-center gap-2 px-3 text-xs font-bold text-cyan-100 transition hover:text-white focus:outline-none focus:underline"><CheckCircle2 className="h-4 w-4" />{isRtl ? 'دخول مساحة العمل الآن' : 'Enter workspace now'}<ArrowRight className={'h-4 w-4 ' + (isRtl ? 'rotate-180' : '')} /></button>
      </div>
    </section>
  );
};
