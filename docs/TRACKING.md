# Tracking plan

GTM container: `GTM-MZF9WH37` (loaded in [index.html](../index.html)).
All events are pushed via [src/lib/analytics.ts](../src/lib/analytics.ts). GA4 lives inside the GTM container — there is no hard-coded `gtag.js` snippet on the site, so all destination tagging is configured in the GTM workspace.

## Identification

`setAnalyticsUser({ user_id, tenant_id, plan, subscription_status, language, is_admin })` is called:

- after `login` / `sign_up` succeed
- after `getCurrentUser` resolves a stored session (root + workspace shells)
- after the user changes their language in Settings (partial update)

`clearAnalyticsUser()` runs on logout.

Every `dataLayer.push` merges in the current user context, so **every event downstream carries `tenant_id`, `plan`, `subscription_status`, `language`, `is_admin`** unless they're missing. These should be promoted to GA4 user properties in the GTM workspace.

## Consent

Default consent state is set inline in [index.html](../index.html) **before** the GTM script tag, so it lands before any tag fires. State is read from `localStorage['analytics-consent']`.

| Storage value | `ad_storage` | `ad_user_data` | `ad_personalization` | `analytics_storage` |
|---|---|---|---|---|
| `granted` | granted | granted | granted | granted |
| `denied` or missing | denied | denied | denied | denied |

The [ConsentBanner](../src/components/ConsentBanner.tsx) is mounted globally in `App.tsx` and:
- shows when `localStorage['analytics-consent']` is missing
- calls `setConsent('granted' | 'denied')` on click, which `gtag('consent', 'update', …)`s and persists

## Event catalog

| Event | Fired from | Properties |
|---|---|---|
| `page_view` | `App.tsx` route change | `page_path`, `page_location`, `page_title` |
| `identify` | `setAnalyticsUser` | (user context only) |
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

## GTM workspace setup (one-time)

These changes need to be made inside the GTM workspace by someone with edit access:

1. **GA4 Configuration tag**
   - Tag type: *Google Analytics: GA4 Configuration*
   - Measurement ID: `G-XXXXXXXXXX` (production property)
   - Trigger: All Pages
   - **Do not** set `user_id` only here — the Config tag fires before `authService.getCurrentUser()` resolves, so the value is `undefined` at that point. Set it per-event instead (see step 3).

   User properties on the Config tag are still useful as a fallback for the very first hit, but rely on per-event mapping for accuracy.

2. **DataLayer variables** — create one for every property in the catalog above plus the user-context fields. Naming convention: `DLV - <name>`.

3. **GA4 Event tags** — one per event in the catalog. Each forwards the relevant DLV variables. Custom trigger fires when `{{Event}}` equals the event name (e.g. `booking_created`).

   On every event tag, also map:
   - **More Settings → Fields to set** → `user_id` = `{{DLV - user_id}}`
   - **More Settings → User Properties**: `tenant_id`, `plan`, `subscription_status`, `language`, `is_admin`

   This ensures `user_id` is attached per hit and isn't lost when the Config tag's value was empty on the first page load.

4. **Custom dimensions in GA4** (Admin → Custom definitions):
   - `tenant_id` (user-scoped) — to segment retention by tenant
   - `plan` (user-scoped) — to compare trial vs paid behaviour
   - `subscription_status` (user-scoped)
   - `language` (user-scoped)
   - `is_admin` (user-scoped) — exclude staff from funnels

5. **Mark conversions** in GA4 (Admin → Events → Mark as conversion):
   - `sign_up`
   - `booking_created`
   - `invoice_generated`

## Why user_id is per-event, not on the Config tag

`gtag('set', 'user_properties', …)` is intentionally **not** called from `analytics.ts`. With GTM as the only tag manager (no hard-coded `gtag.js`), those `gtag('set', …)` calls turn into `dataLayer.push(['set', 'user_properties', {…}])` entries that GTM's GA4 Config tag does **not** auto-forward to GA4. The reliable path is:

1. `analytics.ts` merges the user context into **every** `dataLayer.push`.
2. GTM event tags pull those fields off the dataLayer and attach them to the GA4 event.

Don't reintroduce `gtag('set', …)` calls thinking they're the source of truth — they aren't.

## Verifying

- Open GTM Preview Mode → load the site → check that `page_view`, `identify`, and the merged user-context fields appear on every event.
- Open GA4 DebugView (Admin → DebugView) with `?gtm_debug=1` in the URL.
- In the browser console: `window.dataLayer` lists every push.
- Confirm the banner: clear `localStorage['analytics-consent']`, reload, accept, and confirm the next `dataLayer` push includes a `consent_update` event and that `analytics_storage` flips to `granted` in GA4 DebugView.

## Known gaps (next iteration)

- No server-side events for `subscription_started` / `subscription_cancelled` — currently the only revenue signal is the trial flow on the landing page. These should be fired from the Elysia backend (Measurement Protocol) when Stripe webhooks fire.
- No channel-sync events (Airbnb / Gathern / Booking.com). `channel_connected` and `channel_sync_failed` would tighten the Pro upsell funnel.
- No first-booking / first-invoice / first-channel-sync activation events. Useful for onboarding emails.
