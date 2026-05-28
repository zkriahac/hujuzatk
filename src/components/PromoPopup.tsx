import { useState } from 'react';
import { X, Sparkle, Check } from 'phosphor-react';
import {
  PROMO_RATE_PCT, PROMO_DISMISS_KEY, CURRENCY_SYMBOL, isPromoActive,
} from '../lib/promoConfig';

type Lang = 'en' | 'ar' | 'tr';

interface PromoPlanCard {
  id: string;
  name: string;
  tagline: string;
  price: number;
  oldPrice?: number;
  priceLabel?: string;
  features: string[];
  cta: string;
  recommended: boolean;
}

interface PromoStrings {
  title: string;
  subtitle: string;
  perYear: string;
  was: string;
  save: string;
  recommended: string;
  plans: PromoPlanCard[];
}

interface Props {
  lang: Lang;
  strings: PromoStrings;
  onStart: (planId: string) => void;
}

export default function PromoPopup({ lang, strings, onStart }: Props) {
  const [closed, setClosed] = useState(false);
  const isRtl = lang === 'ar';
  const promoOn = isPromoActive();

  const handleClose = () => {
    try { localStorage.setItem(PROMO_DISMISS_KEY, new Date().toISOString()); } catch {}
    setClosed(true);
  };

  if (closed) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center"
      style={{
        background: 'rgba(8,15,32,0.6)', backdropFilter: 'blur(8px)',
        padding: 16, animation: 'hzFadeIn .25s ease both',
      }}
      role="dialog" aria-modal="true"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="relative w-full overflow-y-auto"
        style={{
          background: '#fff', borderRadius: 28, padding: 28,
          maxWidth: 720, maxHeight: '92vh',
          boxShadow: '0 60px 120px -20px rgba(11,27,58,.4)',
          fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
        }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute grid place-items-center transition-colors"
          style={{
            top: 18, insetInlineEnd: 18,
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--surface-alt)', color: 'var(--ink-500)',
          }}
        >
          <X size={16} weight="bold" />
        </button>

        {/* Header */}
        <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
          <Sparkle size={16} weight="fill" style={{ color: 'var(--accent-amber)' }} />
          {promoOn && (
            <span className="font-bold uppercase" style={{
              fontSize: 10, letterSpacing: '0.18em', color: 'var(--accent-amber)',
            }}>
              {PROMO_RATE_PCT}% OFF
            </span>
          )}
        </div>
        <h2 className="h-display" style={{
          fontSize: 24, fontWeight: 700, color: 'var(--ink-900)', margin: '0 0 6px', lineHeight: 1.15,
        }}>
          {strings.title}
        </h2>
        <p style={{
          fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.6, margin: '0 0 22px',
        }}>
          {strings.subtitle}
        </p>

        {/* 2×2 plan grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          {strings.plans.map((plan) => {
            const showCrossout = promoOn && plan.oldPrice && plan.price !== plan.oldPrice;
            const isPopular = plan.recommended;
            return (
              <div
                key={plan.id}
                className="relative flex flex-col"
                style={{
                  background: isPopular ? 'var(--ink-900)' : '#fff',
                  color: isPopular ? '#fff' : 'var(--ink-900)',
                  border: isPopular ? 'none' : '1px solid var(--border)',
                  borderRadius: 20, padding: 18,
                  boxShadow: isPopular ? '0 20px 40px -12px rgba(11,27,58,0.4)' : 'var(--sh-sm)',
                }}
              >
                {isPopular && (
                  <div className="absolute font-bold uppercase" style={{
                    top: -10, insetInlineStart: 18,
                    background: 'var(--brand-green)', color: '#fff',
                    padding: '4px 10px', borderRadius: 999,
                    fontSize: 9, letterSpacing: '0.14em',
                  }}>
                    {strings.recommended}
                  </div>
                )}
                {showCrossout && !isPopular && (
                  <div className="absolute font-bold" style={{
                    top: -8, insetInlineEnd: 14,
                    background: 'var(--accent-amber-soft)', color: 'var(--accent-amber)',
                    padding: '3px 9px', borderRadius: 999, fontSize: 10,
                  }}>
                    {strings.save}
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <p className="font-bold uppercase" style={{
                    fontSize: 11, letterSpacing: '0.14em',
                    color: isPopular ? 'var(--brand-green)' : 'var(--brand-green-deep)',
                  }}>
                    {plan.name}
                  </p>
                  <p style={{
                    fontSize: 11, color: isPopular ? 'rgba(255,255,255,0.55)' : 'var(--ink-300)',
                    marginTop: 2, lineHeight: 1.4,
                  }}>{plan.tagline}</p>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 12 }} dir="ltr">
                  {plan.price === 0 ? (
                    <div className="font-extrabold" style={{ fontSize: 16, color: 'var(--brand-green)' }}>
                      {plan.priceLabel}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline flex-wrap" style={{ gap: 6 }}>
                        {showCrossout && (
                          <span className="line-through font-bold" style={{
                            fontSize: 11,
                            color: isPopular ? 'rgba(255,255,255,0.4)' : 'var(--ink-300)',
                          }}>
                            {strings.was} {CURRENCY_SYMBOL}{plan.oldPrice}
                          </span>
                        )}
                        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
                          {CURRENCY_SYMBOL}{plan.price}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: isPopular ? 'rgba(255,255,255,0.6)' : 'var(--ink-500)',
                        }}>{strings.perYear}</span>
                      </div>
                      {(lang === 'ar' || lang === 'en') && (
                        <div style={{
                          fontSize: 10, fontWeight: 600, marginTop: 4,
                          color: isPopular ? 'rgba(255,255,255,0.5)' : 'var(--ink-300)',
                        }}>
                          ≈ {lang === 'ar' ? '﷼' : 'SAR'} {Math.round(plan.price * 3.75)} {strings.perYear}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 3 features */}
                <ul className="flex-1 flex flex-col" style={{ gap: 6, listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
                  {plan.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start" style={{
                      gap: 7, fontSize: 11, fontWeight: 600,
                      color: isPopular ? 'rgba(255,255,255,0.85)' : 'var(--ink-700)',
                    }}>
                      <Check size={11} weight="bold" style={{ color: 'var(--brand-green)', flexShrink: 0, marginTop: 2 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => {
                    try { localStorage.setItem(PROMO_DISMISS_KEY, new Date().toISOString()); } catch {}
                    onStart(plan.id);
                  }}
                  className="font-bold transition-all hover:-translate-y-0.5"
                  style={{
                    width: '100%', padding: '10px 16px',
                    borderRadius: 999, fontSize: 12,
                    background: isPopular ? '#fff' : plan.id === 'enterprise' ? 'var(--ink-900)' : 'var(--brand-green)',
                    color: isPopular ? 'var(--ink-900)' : '#fff',
                    boxShadow: isPopular ? 'none' : plan.id === 'enterprise' ? 'none' : '0 6px 14px -4px rgba(14,159,110,.5)',
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
