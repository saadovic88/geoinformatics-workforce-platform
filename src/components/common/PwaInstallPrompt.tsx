import { useEffect, useState } from 'react';
import { Download, ExternalLink, Share, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const installTarget = () => {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'this device';
};

/** Chrome, Edge and Android expose a native one-click install prompt. */
export function PwaInstallPrompt() {
  const { isRtl } = useLanguage();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pwa-install-dismissed') === 'true');
  const [showHelp, setShowHelp] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const receivePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const installed = () => {
      sessionStorage.setItem('pwa-install-dismissed', 'true');
      setDismissed(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', receivePrompt);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', receivePrompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (dismissed || isStandalone()) return null;
  const ios = isIos();
  const target = installTarget();
  const dismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    setDismissed(true);
  };
  const install = async () => {
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }
    setIsInstalling(true);
    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    setIsInstalling(false);
    if (result.outcome === 'accepted') dismiss();
    setPromptEvent(null);
  };
  const openIosShare = async () => {
    if (!navigator.share) {
      setShowHelp(true);
      return;
    }
    try {
      await navigator.share({ title: 'Geoinformatics', url: window.location.href });
    } catch {
      // A dismissed native share sheet needs no error message.
    }
  };

  const copy = isRtl
    ? {
        title: 'ثبّت منصة جيوانفورماتكس',
        description: ios ? 'أضف المنصة إلى الشاشة الرئيسية لتعمل كتطبيق مستقل.' : 'افتح المنصة كتطبيق مستقل من جهازك بضغطة واحدة.',
        install: `اضغط لتثبيت التطبيق على ${target}`, installing: 'جارٍ فتح نافذة التثبيت...', help: `اضغط لتثبيت التطبيق على ${target}`, iosShare: 'اضغط لفتح قائمة المشاركة',
        iosHint: 'من قائمة المشاركة اختر «إضافة إلى الشاشة الرئيسية».',
        browserHint: 'من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «Install app».',
        unavailable: 'قد يظهر خيار التثبيت بعد فتح المنصة مرة واحدة مع اتصال بالإنترنت.',
      }
    : {
        title: 'Install Geoinformatics',
        description: ios ? 'Add the platform to your Home Screen as a standalone app.' : 'Open the platform as a standalone app with one click.',
        install: `Click to install on ${target}`, installing: 'Opening installer…', help: `Click to install on ${target}`, iosShare: 'Click to open Share menu',
        iosHint: 'From Share, choose “Add to Home Screen”.',
        browserHint: 'From your browser menu ⋮, choose “Install app”.',
        unavailable: 'Installation may appear after opening the platform once while online.',
      };

  return (
    <aside className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto w-auto max-w-sm rounded-xl border border-slate-200 bg-white p-3 shadow-[0_14px_34px_-20px_rgba(15,47,95,.45)] dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:right-5" aria-label={copy.title} dir={isRtl ? 'rtl' : 'ltr'}>
      <button onClick={dismiss} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-800" aria-label={isRtl ? 'إغلاق' : 'Dismiss'}><X className="h-4 w-4" /></button>
      <div className={`flex gap-2.5 ${isRtl ? 'pl-6 text-right' : 'pr-6'}`}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"><Smartphone className="h-[18px] w-[18px]" /></div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">{copy.title}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-600 dark:text-slate-300">{copy.description}</p>
          {ios ? (
            <>
              <button onClick={openIosShare} className="mt-2.5 inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-[11px] font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"><Share className="h-3.5 w-3.5" />{copy.iosShare}</button>
              <p className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-5 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">{copy.iosHint}</p>
            </>
          ) : (
            <>
              <button onClick={install} disabled={isInstalling} className="mt-2.5 inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-[11px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
                {promptEvent ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                {isInstalling ? copy.installing : promptEvent ? copy.install : copy.help}
              </button>
              {!promptEvent && (showHelp ? <p className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-5 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">{copy.browserHint}<br />{copy.unavailable}</p> : <p className="mt-1.5 text-[10px] text-slate-400">{copy.unavailable}</p>)}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
