/**
 * Analytics helper — pushes events to GTM dataLayer and gtag.
 * GTM & GA4 scripts are loaded in index.html.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
  }
}

// Push to GTM dataLayer
function push(data: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}

// ─── Page View ──────────────────────────────────────────
export function trackPageView(path: string, title?: string) {
  push({
    event: 'page_view',
    page_path: path,
    page_title: title || document.title,
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
}) {
  push({
    event: 'booking_created',
    room: booking.room,
    nights: booking.nights,
    value: booking.totalPrice,
    currency: booking.currency,
  });
}

export function trackBookingUpdated(bookingId: string) {
  push({ event: 'booking_updated', booking_id: bookingId });
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
