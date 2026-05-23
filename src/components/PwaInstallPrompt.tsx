import { useEffect, useState } from 'react';
import { X, DeviceMobile, Sparkle, ShareNetwork, Plus } from 'phosphor-react';
import { cn } from '../utils/cn';
import { t, type Language } from '../lib/i18n';
import { usePwaInstall } from '../lib/pwaInstall';

// Persist dismissal count and timestamp so a user who dismisses repeatedly
// stops seeing the prompt entirely.
const DISMISS_COUNT_KEY = 'hujuzatk_pwa_dismiss_count';
const DISMISS_AT_KEY = 'hujuzatk_pwa_dismissed_at';
const MAX_DISMISSALS = 3;
// Show window: prompt appears at this delay after mount, stays visible for VISIBLE_MS.
const APPEAR_DELAY_MS = 1_000; // small delay so we don't fight the page for first paint
const VISIBLE_MS = 5 * 60_000; // user said "5 min" — auto-hide after that

interface Props {
  lang: Language;
  isRtl: boolean;
}

export default function PwaInstallPrompt({ lang, isRtl }: Props) {
  const { standalone, ios, canPrompt, install } = usePwaInstall();
  const [iosExpanded, setIosExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const [overDismissed, setOverDismissed] = useState(false);

  useEffect(() => {
    if (standalone) return;
    let count = 0;
    try {
      count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10) || 0;
    } catch {}
    if (count >= MAX_DISMISSALS) {
      setOverDismissed(true);
      return;
    }
    const showTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    const hideTimer = setTimeout(() => setVisible(false), APPEAR_DELAY_MS + VISIBLE_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [standalone]);

  const hasPrompt = canPrompt || ios;
  if (standalone || overDismissed || !hasPrompt || !visible || dismissedThisSession) return null;

  const handleInstall = async () => {
    if (canPrompt) {
      const accepted = await install();
      if (accepted) setDismissedThisSession(true);
      return;
    }
    if (ios) {
      setIosExpanded(true);
      return;
    }
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
        'fixed bottom-4 z-[120] max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300',
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
          {ios && iosExpanded ? (
            // Step-by-step iOS instructions. iOS never fires beforeinstallprompt — Add-to-Home-Screen
            // is the only path, and most users don't discover it. We spell it out.
            <ol className="text-xs text-slate-600 mt-2 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center">1</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  {t(lang, 'pwa.iosStep1')}
                  <ShareNetwork size={14} weight="bold" className="text-blue-500 inline" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center">2</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  {t(lang, 'pwa.iosStep2')}
                  <Plus size={14} weight="bold" className="text-slate-500 inline" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center">3</span>
                <span>{t(lang, 'pwa.iosStep3')}</span>
              </li>
            </ol>
          ) : (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {ios ? t(lang, 'pwa.iosBody') : t(lang, 'pwa.body')}
            </p>
          )}
          <button
            onClick={ios && iosExpanded ? handleDismiss : handleInstall}
            className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition-colors"
          >
            {ios && iosExpanded ? t(lang, 'pwa.gotIt') : t(lang, 'pwa.install')}
          </button>
        </div>
      </div>
    </div>
  );
}
