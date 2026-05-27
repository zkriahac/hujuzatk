/**
 * Analytics helper — pushes events to GTM dataLayer (and GA4 via the GTM container).
 *
 * GTM script + consent-mode defaults are wired in index.html. This module:
 *   - identifies the active user/tenant on every event (setAnalyticsUser/clearAnalyticsUser)
 *   - exposes typed event helpers used across the app
 *   - exposes setConsent/hasConsent for the cookie banner
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
  }
}

// ─── User context (attached to every event) ─────────────
type UserContext = {
  user_id?: string;
  tenant_id?: string;
  plan?: string;
  subscription_status?: string;
  language?: string;
  is_admin?: boolean;
};

let userContext: UserContext = {};

function push(data: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ...userContext, ...data });
}

// Identification works by merging userContext into every dataLayer push.
// The GA4 Event tag in GTM must map each user field to a GA4 event parameter
// (and `user_id` must be set per-event, not only on the GA4 Config tag — see
// docs/TRACKING.md). gtag('set', …) is intentionally avoided because GTM
// doesn't forward those dataLayer entries to GA4 by default.
export function setAnalyticsUser(ctx: UserContext) {
  userContext = { ...userContext, ...ctx };
  push({ event: 'identify' });
}

export function clearAnalyticsUser() {
  userContext = {};
  push({ event: 'reset' });
}

// ─── Consent (GA4 consent mode v2) ──────────────────────
const CONSENT_KEY = 'analytics-consent';
type ConsentState = 'granted' | 'denied';

export function setConsent(state: ConsentState) {
  localStorage.setItem(CONSENT_KEY, state);
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
    });
  }
  push({ event: 'consent_update', consent_state: state });
}

export function hasConsent(): ConsentState | null {
  const v = localStorage.getItem(CONSENT_KEY);
  return v === 'granted' || v === 'denied' ? v : null;
}

// ─── Page View ──────────────────────────────────────────
export function trackPageView(path: string, title?: string) {
  push({
    event: 'page_view',
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : path,
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
  });
}

// ─── Auth Events ────────────────────────────────────────
export function trackLogin(method: string) {
  push({ event: 'login', method });
}

export function trackRegister(workspaceName: string) {
  push({ event: 'sign_up', workspace_name: workspaceName });
}

export function trackLogout() {
  push({ event: 'logout' });
}

// ─── Booking Events ─────────────────────────────────────
export function trackBookingCreated(booking: {
  room: string;
  nights: number;
  totalPrice: number;
  currency: string;
  source?: string;
}) {
  push({
    event: 'booking_created',
    room: booking.room,
    nights: booking.nights,
    value: booking.totalPrice,
    currency: booking.currency,
    source: booking.source,
  });
}

export function trackBookingUpdated(bookingId: string, changedFields?: string[]) {
  push({
    event: 'booking_updated',
    booking_id: bookingId,
    changed_fields: changedFields,
  });
}

export function trackBookingCanceled(bookingId: string) {
  push({ event: 'booking_canceled', booking_id: bookingId });
}

// ─── Navigation / UI Events ─────────────────────────────
export function trackViewChange(view: string) {
  push({ event: 'view_change', view });
}

export function trackLanguageChange(lang: string) {
  push({ event: 'language_change', language: lang });
}

// ─── Landing Page Events ────────────────────────────────
export function trackCTA(ctaName: string, location: string) {
  push({ event: 'cta_click', cta_name: ctaName, cta_location: location });
}

export function trackWorkspaceSearch(workspaceName: string) {
  push({ event: 'workspace_search', workspace_name: workspaceName });
}

// ─── Invoice Events ─────────────────────────────────────
export function trackInvoiceGenerated(bookingId: string) {
  push({ event: 'invoice_generated', booking_id: bookingId });
}
