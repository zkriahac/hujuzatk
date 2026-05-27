import { useEffect, useState } from 'react';
import { setConsent, hasConsent } from '../lib/analytics';

type Lang = 'en' | 'ar' | 'tr';

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem('landing-lang');
    if (stored === 'ar' || stored === 'tr' || stored === 'en') return stored;
  } catch {}
  if (typeof navigator !== 'undefined') {
    if (navigator.language?.startsWith('ar')) return 'ar';
    if (navigator.language?.startsWith('tr')) return 'tr';
  }
  return 'en';
}

const COPY: Record<Lang, { body: string; accept: string; reject: string; learn: string }> = {
  en: {
    body: 'We use cookies to measure how Hujuzatk is used and to improve it. Analytics only — no ads.',
    accept: 'Accept',
    reject: 'Reject',
    learn: 'Privacy',
  },
  ar: {
    body: 'نستخدم ملفات تعريف الارتباط لقياس استخدام حجوزاتك وتحسينه. تحليلات فقط — بدون إعلانات.',
    accept: 'موافق',
    reject: 'رفض',
    learn: 'الخصوصية',
  },
  tr: {
    body: 'Hujuzatk\'ı nasıl kullandığınızı ölçmek ve geliştirmek için çerez kullanıyoruz. Sadece analiz — reklam yok.',
    accept: 'Kabul',
    reject: 'Reddet',
    learn: 'Gizlilik',
  },
};

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    setLang(detectLang());
    setVisible(hasConsent() === null);
  }, []);

  if (!visible) return null;
  const c = COPY[lang];
  const isRtl = lang === 'ar';

  const decide = (state: 'granted' | 'denied') => {
    setConsent(state);
    setVisible(false);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[9999]"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="rounded-xl shadow-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="leading-snug">
          {c.body}{' '}
          <a href="/privacy" className="underline text-emerald-700 hover:text-emerald-800">
            {c.learn}
          </a>
        </p>
        <div className="mt-3 flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => decide('denied')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            {c.reject}
          </button>
          <button
            type="button"
            onClick={() => decide('granted')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
          >
            {c.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
