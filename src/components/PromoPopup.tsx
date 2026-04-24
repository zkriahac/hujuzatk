import { useState } from 'react';
import { X, Sparkle, Check } from 'phosphor-react';
import {
  PLAN_BASIC, PLAN_PRO, CURRENCY_SYMBOL, PROMO_RATE_PCT,
  PROMO_DISMISS_KEY,
} from '../lib/promoConfig';

type Lang = 'en' | 'ar' | 'tr';

interface PromoPlan {
  id: string;
  name: string;
  tagline: string;
  recommended: boolean;
}

interface PromoStrings {
  title: string;
  subtitle: string;
  placeholder: string;
  cta: string;
  perYear: string;
  was: string;
  save: string;
  recommended: string;
  basic: PromoPlan;
  pro: PromoPlan;
}

interface Props {
  lang: Lang;
  strings: PromoStrings;
  onStart: (workspace: string) => void;
}

export default function PromoPopup({ lang, strings, onStart }: Props) {
  const [workspace, setWorkspace] = useState('');
  const [closed, setClosed] = useState(false);
  const isRtl = lang === 'ar';

  const handleClose = () => {
    try { localStorage.setItem(PROMO_DISMISS_KEY, new Date().toISOString()); } catch {}
    setClosed(true);
  };

  const handleSubmit = () => {
    // Also mark as dismissed so it doesn't re-appear right after submit
    try { localStorage.setItem(PROMO_DISMISS_KEY, new Date().toISOString()); } catch {}
    onStart(workspace);
  };

  if (closed) return null;

  const Price = ({ plan }: { plan: typeof PLAN_BASIC | typeof PLAN_PRO }) => (
    <div className="flex items-baseline gap-2" dir="ltr">
      <span className="text-[11px] text-slate-400 line-through font-bold">
        {strings.was} {CURRENCY_SYMBOL}{plan.oldPrice}
      </span>
      <span className="text-3xl font-black text-emerald-600">
        {CURRENCY_SYMBOL}{plan.newPrice}
      </span>
      <span className="text-xs text-slate-500 font-bold">{strings.perYear}</span>
    </div>
  );

  const PlanCard = ({
    planName, tagline, planData, recommended,
  }: { planName: string; tagline: string; planData: typeof PLAN_BASIC | typeof PLAN_PRO; recommended: boolean }) => (
    <div className={`relative rounded-2xl border p-5 ${recommended ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
      {recommended && (
        <div className={`absolute -top-2.5 ${isRtl ? 'right-4' : 'left-4'} bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full`}>
          {strings.recommended}
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{planName}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{tagline}</p>
        </div>
        <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
          {strings.save}
        </span>
      </div>
      <Price plan={planData} />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-7 relative">
        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close"
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} text-slate-400 hover:text-slate-800 transition-colors`}
        >
          <X size={22} weight="bold" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkle size={18} weight="fill" className="text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
            {PROMO_RATE_PCT}% OFF
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1.5">
          {strings.title}
        </h2>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          {strings.subtitle}
        </p>

        {/* Two plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <PlanCard planName={strings.basic.name} tagline={strings.basic.tagline} planData={PLAN_BASIC} recommended={false} />
          <PlanCard planName={strings.pro.name} tagline={strings.pro.tagline} planData={PLAN_PRO} recommended={true} />
        </div>

        {/* Workspace input + CTA */}
        <div className="space-y-2">
          <input
            type="text"
            value={workspace}
            onChange={e => setWorkspace(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder={strings.placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} weight="bold" />
            {strings.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
