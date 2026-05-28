/**
 * Analytics helper — thin wrapper over GA4 (gtag.js).
 *
 * gtag.js + consent-mode defaults are wired in index.html. This module:
 *   - identifies the active user/tenant on every event (setAnalyticsUser/clearAnalyticsUser)
 *   - exposes typed event helpers used across the app
 *   - exposes setConsent/hasConsent for the cookie banner
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-WF9CRGDX9G';

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  // gtag is defined inline in index.html before this module loads.
  // Fall back to dataLayer.push for the rare race where it isn't yet.
  if (typeof window.gtag === 'function') {
    (window.gtag as (...a: unknown[]) => void)(...args);
  } else {
    (window.dataLayer = window.dataLayer || []).push(args);
  }
}

function event(name: string, params?: Record<string, unknown>) {
  gtag('event', name, params || {});
}

// ─── User identity ──────────────────────────────────────
type UserContext = {
  user_id?: string;
  tenant_id?: string;
  plan?: string;
  subscription_status?: string;
  language?: string;
  is_admin?: boolean;
};

export function setAnalyticsUser(ctx: UserContext) {
  // user_id is a top-level GA4 concept; set it via config so it sticks to
  // every subsequent hit on this measurement ID.
  if (ctx.user_id) {
    gtag('config', GA_MEASUREMENT_ID, {
      user_id: ctx.user_id,
      send_page_view: false,
    });
  }
  // Everything else lives in user_properties (queryable as custom dimensions
  // in GA4 once registered in Admin → Custom definitions).
  gtag('set', 'user_properties', {
    tenant_id: ctx.tenant_id,
    plan: ctx.plan,
    subscription_status: ctx.subscription_status,
    language: ctx.language,
    is_admin: ctx.is_admin,
  });
  event('identify');
}

export function clearAnalyticsUser() {
  gtag('config', GA_MEASUREMENT_ID, {
    user_id: null,
    send_page_view: false,
  });
  gtag('set', 'user_properties', {
    tenant_id: null,
    plan: null,
    subscription_status: null,
    language: null,
    is_admin: null,
  });
  event('reset');
}

// ─── Consent (GA4 consent mode v2) ──────────────────────
const CONSENT_KEY = 'analytics-consent';
type ConsentState = 'granted' | 'denied';

export function setConsent(state: ConsentState) {
  localStorage.setItem(CONSENT_KEY, state);
  gtag('consent', 'update', {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  });
  event('consent_update', { consent_state: state });
}

export function hasConsent(): ConsentState | null {
  const v = localStorage.getItem(CONSENT_KEY);
  return v === 'granted' || v === 'denied' ? v : null;
}

// ─── Page View ──────────────────────────────────────────
export function trackPageView(path: string, title?: string) {
  event('page_view', {
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : path,
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
  });
}

// ─── Auth Events ────────────────────────────────────────
export function trackLogin(method: string) {
  event('login', { method });
}

export function trackRegister(workspaceName: string) {
  event('sign_up', { workspace_name: workspaceName });
}

export function trackLogout() {
  event('logout');
}

// ─── Booking Events ─────────────────────────────────────
export function trackBookingCreated(booking: {
  room: string;
  nights: number;
  totalPrice: number;
  currency: string;
  source?: string;
}) {
  event('booking_created', {
    room: booking.room,
    nights: booking.nights,
    value: booking.totalPrice,
    currency: booking.currency,
    source: booking.source,
  });
}

export function trackBookingUpdated(bookingId: string, changedFields?: string[]) {
  event('booking_updated', {
    booking_id: bookingId,
    changed_fields: changedFields,
  });
}

export function trackBookingCanceled(bookingId: string) {
  event('booking_canceled', { booking_id: bookingId });
}

// ─── Navigation / UI Events ─────────────────────────────
export function trackViewChange(view: string) {
  event('view_change', { view });
}

export function trackLanguageChange(lang: string) {
  event('language_change', { language: lang });
}

// ─── Landing Page Events ────────────────────────────────
export function trackCTA(ctaName: string, location: string) {
  event('cta_click', { cta_name: ctaName, cta_location: location });
}

export function trackWorkspaceSearch(workspaceName: string) {
  event('workspace_search', { workspace_name: workspaceName });
}

// ─── Invoice Events ─────────────────────────────────────
export function trackInvoiceGenerated(bookingId: string) {
  event('invoice_generated', { booking_id: bookingId });
}
