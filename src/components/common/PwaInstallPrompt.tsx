import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pwa-install-dismissed') === 'true');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const receivePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', receivePrompt);
    return () => window.removeEventListener('beforeinstallprompt', receivePrompt);
  }, []);

  if (dismissed || isStandalone()) return null;
  const ios = isIos();
  const dismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    setDismissed(true);
  };
  const install = async () => {
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }
    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result.outcome === 'accepted') dismiss();
    setPromptEvent(null);
  };

  return (
    <aside className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto w-auto max-w-sm rounded-2xl border border-blue-100 bg-white p-3.5 shadow-[0_18px_45px_-16px_rgba(15,47,95,.42)] dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:right-5" aria-label="Install application">
      <button onClick={dismiss} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-800" aria-label="Dismiss install prompt"><X className="h-4 w-4" /></button>
      <div className="flex gap-3 pr-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"><Smartphone className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Install Geoinformatics</p>
          {ios ? <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">In Safari, tap <Share className="mx-0.5 inline h-3.5 w-3.5" /> Share, then choose “Add to Home Screen”.</p> : <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Keep the platform one tap away as an installed app.</p>}
          {!ios && <button onClick={install} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-3.5 text-xs font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"><Download className="h-4 w-4" />{promptEvent ? 'Install app' : 'Download app'}</button>}
          {!ios && !promptEvent && (showHelp ? <p className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-5 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">Use your browser menu ⋮ and choose “Install app”. On iPhone/iPad, use Safari → Share → Add to Home Screen.</p> : <p className="mt-1.5 text-[10px] text-slate-400">Click to view the installation method for your device.</p>)}
        </div>
      </div>
    </aside>
  );
}
