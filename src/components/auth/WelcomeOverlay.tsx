import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface WelcomeOverlayProps {
  user: User;
  onContinue: () => void;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

/** A brief, non-blocking hand-off from authentication into the workspace. */
export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ user, onContinue }) => {
  const { isRtl } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const reducedMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  const name = isRtl ? user.nameAr : user.nameEn;
  const title = isRtl ? user.jobTitleAr : user.jobTitleEn;

  useEffect(() => {
    const timer = window.setTimeout(onContinue, reducedMotion ? 180 : 1800);
    return () => window.clearTimeout(timer);
  }, [onContinue, reducedMotion]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // The hand-off is a real modal state, not merely a visual layer. Move
    // keyboard focus into it and make its application siblings non-interactive
    // until the employee enters the workspace (or it finishes automatically).
    dialog.focus({ preventScroll: true });
    const siblingStates = Array.from(dialog.parentElement?.children ?? [])
      .filter((element) => element !== dialog)
      .map((element) => ({
        element,
        hadInert: element.hasAttribute('inert'),
        previousAriaHidden: element.getAttribute('aria-hidden'),
      }));

    siblingStates.forEach(({ element }) => {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });

    return () => siblingStates.forEach(({ element, hadInert, previousAriaHidden }) => {
      if (!hadInert) element.removeAttribute('inert');
      if (previousAriaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', previousAriaHidden);
    });
  }, []);

  return (
    <section ref={dialogRef} tabIndex={-1} dir={isRtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-label={isRtl ? 'رسالة ترحيب' : 'Welcome'} className="welcome-portal fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#07172d] px-5 text-white">
      <div aria-hidden="true" className="absolute inset-0 welcome-grid opacity-70" />
      <div aria-hidden="true" className="absolute -left-32 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-36 -right-24 h-[26rem] w-[26rem] rounded-full bg-cyan-400/10 blur-3xl" />
      <button type="button" onClick={onContinue} className="absolute end-5 top-5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300">
        {isRtl ? 'تخطي' : 'Skip'}
      </button>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mx-auto mb-7 grid h-20 w-20 place-items-center rounded-2xl border border-white/15 bg-white/10 text-cyan-100 shadow-[0_18px_50px_rgba(0,0,0,.25)] backdrop-blur">
          <ShieldCheck className="h-9 w-9" />
        </div>
        <div className="welcome-avatar-wrap relative mx-auto grid h-36 w-36 place-items-center">
          <span aria-hidden="true" className="welcome-radar-ring absolute inset-0 rounded-full border border-cyan-200/45" />
          <span aria-hidden="true" className="welcome-radar-ring welcome-radar-ring--outer absolute -inset-4 rounded-full border border-dashed border-blue-300/30" />
          <span aria-hidden="true" className="welcome-radar-dot absolute -top-1 start-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.95)]" />
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-[#e7f3ff] bg-gradient-to-br from-blue-200 to-cyan-100 shadow-[0_16px_40px_rgba(0,0,0,.34)]">
            {user.avatarUrl && !imageFailed ? <img src={user.avatarUrl} alt="" onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-2xl font-black text-[#153b6d]">{initials(name)}</span>}
          </div>
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.24em] text-cyan-200/85">{isRtl ? 'بوابة العمليات جاهزة' : 'Operations workspace ready'}</p>
        <h1 className="welcome-greeting mt-3 text-3xl font-black tracking-tight sm:text-4xl">{isRtl ? `مرحبًا ${name}` : `Welcome, ${name}`}</h1>
        <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{user.employeeCode}</p>
        <div className="mx-auto mt-8 max-w-xs rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-start shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100"><MapPin className="h-4 w-4 text-cyan-300" />{isRtl ? 'جارٍ تجهيز مساحة عملك الآمنة' : 'Preparing your secure workspace'}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="welcome-progress block h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-blue-500" /></div>
        </div>
        <button type="button" onClick={onContinue} className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-cyan-100 transition hover:text-white focus:outline-none focus:underline">
          <CheckCircle2 className="h-4 w-4" />{isRtl ? 'دخول مساحة العمل الآن' : 'Enter workspace now'}<ArrowRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </section>
  );
};
