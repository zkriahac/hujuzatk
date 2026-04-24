import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { X } from 'phosphor-react';
import { t, type Language } from '../lib/i18n';

export interface OnboardingStep {
  /** CSS selector for the element to highlight. Null → center-screen final slide. */
  targetSelector: string | null;
  titleKey: string;
  bodyKey: string;
  /** Where the tooltip sits relative to the target. Default auto (bottom). */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface Props {
  steps: OnboardingStep[];
  lang: Language;
  onComplete: () => void;
  onSkip: () => void;
  /** Parent can react to step changes (e.g. open a dropdown so the target exists). */
  onStepChange?: (index: number, step: OnboardingStep) => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_WIDTH = 320;

export default function OnboardingTour({ steps, lang, onComplete, onSkip, onStepChange }: Props) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[idx];
  const total = steps.length;
  const isLast = idx === total - 1;

  // Notify parent of step change (for dropdown opening, etc.)
  useEffect(() => {
    if (step) onStepChange?.(idx, step);
  }, [idx, step, onStepChange]);

  // Lock body scroll while tour is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Recompute target rect on mount, resize, scroll, and step change
  useLayoutEffect(() => {
    if (!step) return;
    const compute = () => {
      if (!step.targetSelector) { setRect(null); return; }
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (!el) {
        if (typeof console !== 'undefined') console.warn(`[OnboardingTour] Missing target: ${step.targetSelector}`);
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // Give the DOM a tick in case parent is opening a menu first
    const raf1 = requestAnimationFrame(() => {
      compute();
      // Second frame in case layout shifted from the first
      requestAnimationFrame(compute);
    });
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [step]);

  const tooltipPos = useMemo(() => {
    if (!rect) {
      // Center on screen for final step (no target)
      return {
        top: typeof window !== 'undefined' ? window.innerHeight / 2 - 120 : 200,
        left: typeof window !== 'undefined' ? window.innerWidth / 2 - TOOLTIP_WIDTH / 2 : 100,
      };
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    // Try below target first
    let top = rect.top + rect.height + 12;
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    // If tooltip would go off bottom, place above
    if (top + 200 > vh) top = Math.max(16, rect.top - 200 - 12);
    // Clamp horizontal
    if (left < 16) left = 16;
    if (left + TOOLTIP_WIDTH > vw - 16) left = vw - TOOLTIP_WIDTH - 16;
    return { top, left };
  }, [rect]);

  if (!step) return null;

  const title = t(lang, step.titleKey);
  const body = t(lang, step.bodyKey);
  const stepCounter = t(lang, 'onboarding.stepCounter')
    .replace('{n}', String(idx + 1))
    .replace('{total}', String(total));

  const handleNext = () => {
    if (isLast) onComplete();
    else setIdx(i => i + 1);
  };
  const handlePrev = () => setIdx(i => Math.max(0, i - 1));

  // Build the "spotlight" frame — four divs surrounding the target with the dark backdrop
  const hasTarget = !!rect;
  const spotTop = hasTarget ? rect!.top - PADDING : 0;
  const spotLeft = hasTarget ? rect!.left - PADDING : 0;
  const spotW = hasTarget ? rect!.width + PADDING * 2 : 0;
  const spotH = hasTarget ? rect!.height + PADDING * 2 : 0;

  return (
    <div className="fixed inset-0 z-[180] pointer-events-none" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Four backdrop panels forming a frame around the spotlight */}
      {hasTarget ? (
        <>
          {/* Top */}
          <div className="absolute bg-slate-900/75 pointer-events-auto" style={{ top: 0, left: 0, right: 0, height: spotTop }} />
          {/* Bottom */}
          <div className="absolute bg-slate-900/75 pointer-events-auto" style={{ top: spotTop + spotH, left: 0, right: 0, bottom: 0 }} />
          {/* Left */}
          <div className="absolute bg-slate-900/75 pointer-events-auto" style={{ top: spotTop, left: 0, width: spotLeft, height: spotH }} />
          {/* Right */}
          <div className="absolute bg-slate-900/75 pointer-events-auto" style={{ top: spotTop, left: spotLeft + spotW, right: 0, height: spotH }} />
          {/* Emerald outline around spotlight */}
          <div
            className="absolute rounded-2xl ring-4 ring-emerald-400 pointer-events-none"
            style={{ top: spotTop, left: spotLeft, width: spotW, height: spotH }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-900/75 pointer-events-auto" />
      )}

      {/* Tooltip card */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl p-5 pointer-events-auto"
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            {stepCounter}
          </span>
          <button
            onClick={onSkip}
            aria-label={t(lang, 'onboarding.skip')}
            className="text-slate-400 hover:text-slate-700 -mt-1 -mr-1"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        <h3 className="text-base font-black text-slate-900 mb-1.5">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">{body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-xs font-black text-slate-400 hover:text-slate-700"
          >
            {t(lang, 'onboarding.skip')}
          </button>
          <div className="flex gap-2">
            {idx > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-2 text-xs font-black bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
              >
                {t(lang, 'onboarding.prev')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 text-xs font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
            >
              {isLast ? t(lang, 'onboarding.done') : t(lang, 'onboarding.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
