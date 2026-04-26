/**
 * Year-end 2026 promo configuration — single source of truth for both
 * the landing page pricing cards and the 10-second promo popup.
 *
 * When the promo ends, change PROMO_END (or just let the date pass —
 * isPromoActive() auto-hides the discount everywhere).
 */

export const PROMO_END = '2026-12-31';

export const PLAN_BASIC = {
  id: 'basic',
  oldPrice: 50,
  newPrice: 40,
} as const;

export const PLAN_PRO = {
  id: 'pro',
  oldPrice: 100,
  newPrice: 90,
} as const;

export const PLAN_ENTERPRISE = {
  id: 'enterprise',
  oldPrice: 150,
  newPrice: 140,
} as const;

export const PROMO_RATE_PCT = 20; // up to 20% off

export const CURRENCY_SYMBOL = '$';

export function isPromoActive(now: Date = new Date()): boolean {
  return now <= new Date(`${PROMO_END}T23:59:59Z`);
}

// localStorage key for dismiss-timestamp (ISO string). 7-day re-show rule.
export const PROMO_DISMISS_KEY = 'hujuzatk_promo_dismissed_at';
export const PROMO_DISMISS_COOLDOWN_DAYS = 7;
