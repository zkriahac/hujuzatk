# Tracking plan

GA4 measurement ID: **`G-WF9CRGDX9G`** (loaded directly via `gtag.js` in [index.html](../index.html)).
All events are emitted via [src/lib/analytics.ts](../src/lib/analytics.ts).

GTM is **not** used. If you want to add Meta / TikTok / etc. pixels later, easiest path is to add them alongside `gtag.js` rather than reintroducing GTM.

## Identification

`setAnalyticsUser({ user_id, tenant_id, plan, subscription_status, language, is_admin })` calls:

- `gtag('config', 'G-WF9CRGDX9G', { user_id })` — sets `user_id` on every subsequent hit
- `gtag('set', 'user_properties', { tenant_id, plan, ... })` — sets user properties globally

Triggers:
- after `login` / `sign_up` succeed
- after `getCurrentUser` resolves a stored session (root + workspace shells)
- after the user changes their language in Settings (partial update)

`clearAnalyticsUser()` runs on logout — clears `user_id` and user_properties via gtag with `null`.

## Consent (GA4 consent mode v2)

Default consent state is set inline in [index.html](../index.html) **before** `gtag.js` loads. State is read from `localStorage['analytics-consent']`.

| Storage value | `ad_storage` | `ad_user_data` | `ad_personalization` | `analytics_storage` |
|---|---|---|---|---|
| `granted` | granted | granted | granted | granted |
| `denied` or missing | denied | denied | denied | denied |

The [ConsentBanner](../src/components/ConsentBanner.tsx) is mounted globally in [App.tsx](../src/App.tsx) and:
- shows when `localStorage['analytics-consent']` is missing
- calls `setConsent('granted' | 'denied')` on click, which `gtag('consent', 'update', …)`s and persists

## Event catalog

| Event | Fired from | Properties |
|---|---|---|
| `page_view` | `App.tsx` route change | `page_path`, `page_location`, `page_title` |
| `identify` | `setAnalyticsUser` | (sets user_id + user_properties) |
| `reset` | `clearAnalyticsUser` | — |
| `consent_update` | banner accept/reject | `consent_state` |
| `login` | `AuthShell` | `method` (`email`) |
| `sign_up` | `AuthShell` | `workspace_name` |
| `logout` | `TenantApp` | — |
| `cta_click` | `LandingPage` | `cta_name`, `cta_location` |
| `workspace_search` | `LandingPage` hero search | `workspace_name` |
| `language_change` | landing-lang switch + Settings save | `language` |
| `view_change` | `TenantApp` sidebar/menu | `view` |
| `booking_created` | `TenantApp.handleAddBooking` | `room`, `nights`, `value`, `currency`, `source` |
| `booking_updated` | `TenantApp.handleUpdateBooking` | `booking_id`, `changed_fields` |
| `booking_canceled` | `TenantApp.handleUpdateBookingStatus` | `booking_id` |
| `invoice_generated` | `BookingDetailsModal.onPrintInvoice` | `booking_id` |

Note: `send_page_view: false` is set on the `gtag('config', …)` call. This is because `App.tsx` fires `page_view` on every SPA route change — disabling auto-page-view avoids double-counting the initial load.

## GA4 setup (one-time, in the GA4 UI)

1. **Register custom dimensions** so user_properties are queryable in reports.
   - GA4 → Admin → Custom definitions → Create custom dimensions.
   - For each of `tenant_id`, `plan`, `subscription_status`, `language`, `is_admin`:
     - Scope: **User**
     - User property: same name as the dimension
   - Custom dimensions can take 24 hours to start populating reports — events still capture in DebugView immediately.

2. **Mark conversions** (Admin → Events → toggle "Mark as conversion"):
   - `sign_up`
   - `booking_created`
   - `invoice_generated`

3. **Optional: domain config**. Admin → Data Streams → your stream → Configure tag settings → Configure your domains. Add `hujuzatk.com` if cross-subdomain tracking is needed.

## Verifying

- Open `https://hujuzatk.com` with `?gtm_debug=1` (or just open GA4 → Admin → DebugView).
- In DevTools console: `window.dataLayer` lists every gtag call.
- Test the consent flow: clear `localStorage['analytics-consent']`, reload, click Accept, watch DebugView flip to receiving events.
- Test identification: log in, then in DebugView confirm the `login` event carries `user_id` and the user_properties panel shows `tenant_id`, `plan`, etc.

## Known gaps (next iteration)

- No server-side events for `subscription_started` / `subscription_cancelled` — currently the only revenue signal is the trial flow on the landing page. These should fire from the Elysia backend (Measurement Protocol API) when Stripe webhooks fire.
- No channel-sync events (Airbnb / Gathern / Booking.com). `channel_connected` and `channel_sync_failed` would tighten the Pro upsell funnel.
- No first-booking / first-invoice / first-channel-sync activation events. Useful for onboarding emails.
