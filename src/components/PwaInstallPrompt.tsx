import { useEffect, useState } from 'react';
import { X, DeviceMobile, Sparkle } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';

// Persist dismissal count and timestamp so a user who dismisses repeatedly
// stops seeing the prompt entirely.
const DISMISS_COUNT_KEY = 'hujuzatk_pwa_dismiss_count';
const DISMISS_AT_KEY = 'hujuzatk_pwa_dismissed_at';
const MAX_DISMISSALS = 3;
// Show window: prompt appears at this delay after mount, stays visible for VISIBLE_MS.
const APPEAR_DELAY_MS = 1_000; // small delay so we don't fight the page for first paint
const VISIBLE_MS = 5 * 60_000; // user said "5 min" — auto-hide after that

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  lang: Language;
  isRtl: boolean;
}

export default function PwaInstallPrompt({ lang, isRtl }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  // Already installed (running standalone) — never show.
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    if (isStandalone) return;
    let count = 0;
    try {
      count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10) || 0;
    } catch {}
    if (count >= MAX_DISMISSALS) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    // Some browsers (Safari iOS) never fire beforeinstallprompt — we still want to
    // surface a manual instruction banner there. Detect roughly via UA.
    const isIosSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIosSafari) {
      // We can't programmatically install on iOS; the banner just shows the steps.
      setDeferred({} as BeforeInstallPromptEvent); // truthy sentinel to render banner
    }

    const showTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    const hideTimer = setTimeout(() => setVisible(false), APPEAR_DELAY_MS + VISIBLE_MS);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isStandalone]);

  if (isStandalone || !deferred || !visible || dismissedThisSession) return null;

  const handleInstall = async () => {
    if (typeof (deferred as any).prompt === 'function') {
      try {
        await (deferred as any).prompt();
        const choice = await (deferred as any).userChoice;
        if (choice?.outcome === 'accepted') {
          setDismissedThisSession(true);
        }
      } catch {}
    }
    // For iOS, "Install" just dismisses since the install path is manual.
    setDismissedThisSession(true);
  };

  const handleDismiss = () => {
    let count = 0;
    try {
      count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10) || 0;
      localStorage.setItem(DISMISS_COUNT_KEY, String(count + 1));
      localStorage.setItem(DISMISS_AT_KEY, new Date().toISOString());
    } catch {}
    setDismissedThisSession(true);
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 z-[120] max-w-sm rounded-3xl bg-white border border-slate-200 shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300',
        isRtl ? 'left-4' : 'right-4',
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
      role="region"
      aria-label={t(lang, 'pwa.title')}
    >
      <button
        onClick={handleDismiss}
        aria-label={t(lang, 'pwa.dismiss')}
        className={cn(
          'absolute top-2 text-slate-300 hover:text-slate-700 transition-colors p-1',
          isRtl ? 'left-2' : 'right-2',
        )}
      >
        <X size={14} weight="bold" />
      </button>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <DeviceMobile size={26} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <Sparkle size={12} weight="fill" className="text-amber-500" />
            {t(lang, 'pwa.title')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {t(lang, 'pwa.body')}
          </p>
          <button
            onClick={handleInstall}
            className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition-colors"
          >
            {t(lang, 'pwa.install')}
          </button>
        </div>
      </div>
    </div>
  );
}
