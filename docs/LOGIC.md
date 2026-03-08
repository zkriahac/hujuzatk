# Business Logic

Core rules and flows that govern how the application works.

---

## Multi-Tenancy

Every tenant is an isolated hotel/property owner account. All data is scoped by `tenantId`.

- Each `Booking`, `AuditLog`, and `Payment` row has a `tenantId` foreign key
- Prisma queries always filter by `context.user.tenantId` — no cross-tenant data leakage
- Tenant isolation is enforced at the resolver level (not just DB level)
- The `Booking` table has a `@@unique([tenantId, id])` constraint for extra safety

### Super Admin

A tenant with `isAdmin = true` can:
- List all tenants (`getAllTenants`)
- Grant subscription days (`createAdminSubscription`)
- Cancel subscriptions (`cancelSubscription`)

Super admin is checked by looking up the tenant record from DB, not just trusting the JWT payload.

---

## Authentication Flow

### Registration

1. FE calls `mutation register(input: RegisterInput)`
2. BE validates: email format, uniqueness, password ≥ 8 chars
3. Password is hashed with `bcrypt` (10 rounds)
4. Tenant created with `subscriptionStatus = 'TRIAL'`, `validUntil = today + TRIAL_DAYS`
5. Default 5 rooms created: `A1–A5`
6. Default `TenantSettings` created: `defaultNightPrice = 50`, `defaultTax = 0`
7. JWT access token (24h) + refresh token (7d) returned
8. FE stores both in `localStorage` (`authToken`, `refreshToken`)

### Login

1. FE calls `mutation login(email, password)`
2. BE looks up tenant by email, compares password hash
3. If `subscriptionStatus` is `EXPIRED` or `CANCELED` → throws `FORBIDDEN`
4. Returns tokens + full tenant object
5. FE stores tokens in `localStorage`

### Token Refresh

1. FE calls `mutation refreshToken(refreshToken)` when access token expires
2. BE verifies the refresh token with `JWT_REFRESH_SECRET`
3. New access + refresh tokens returned (rotation)
4. Old refresh token is invalidated implicitly (stateless — race condition possible with multi-tab)

### Request Auth

1. FE attaches `Authorization: Bearer <token>` header via Apollo's `authLink`
2. BE's `createContext()` extracts and verifies the JWT
3. `context.user = { tenantId, email, iat, exp }`
4. Protected resolvers call `requireAuth(context)` — throws `UNAUTHENTICATED` if no user

### Token Expiry / Error Handling

- Apollo's `errorLink` catches `UNAUTHENTICATED` errors → clears both tokens → redirects to `/user/login`
- `authService.ts` also catches fetch errors and clears tokens on failure

---

## Subscription System

### Statuses

| Status | Meaning |
|--------|---------|
| `TRIAL` | New account, access until `validUntil` |
| `ACTIVE` | Paid/admin-granted, access until `validUntil` |
| `EXPIRED` | Past `validUntil`, login blocked |
| `CANCELED` | Manually canceled, login blocked |

### Rules

- On login: if status is `EXPIRED` or `CANCELED`, access is denied immediately
- Trial period: `TRIAL_DAYS` env var (default 14), set at registration time
- Admin can grant days with `createAdminSubscription(tenantId, days)`:
  - Sets `subscriptionStatus = 'active'`
  - Sets `validUntil = now + days`
  - Creates a `Payment` record with `amount = 0` and `planType = 'admin-grant'`
- There is no automated expiry check on every request — `validUntil` is only checked at login

---

## Booking Lifecycle

### Status Values

| Status | Meaning |
|--------|---------|
| `UPCOMING` | Future booking (default) |
| `ACTIVE` | Guest currently checked in |
| `COMPLETED` | Stay is over |
| `CANCELED` | Booking canceled |
| `NO_SHOW` | Guest didn't arrive |

Status is stored lowercase in DB and normalized to uppercase on read (`normalizeBooking`).

### Pricing Calculation

All pricing is computed server-side on create/update:

```
nights      = differenceInCalendarDays(checkOut, checkIn)
totalPrice  = nights × nightPrice
tax         = totalPrice × (defaultTax / 100)
remaining   = totalPrice + tax - deposit
```

- `nights` must be > 0 (checkOut must be after checkIn)
- `nightPrice` and `deposit` must be ≥ 0
- Tax rate comes from `TenantSettings.defaultTax` (percentage, 0–100)

### Room Validation

- Rooms are stored as JSON on the `Tenant` record: `[{ id, name }]`
- On `createBooking`, the `room` field is validated against the tenant's room list
- Room IDs are: default `A1–A5`, custom rooms get `R<timestamp>` IDs

### Audit Log

Every create, update, and delete of a booking writes to `AuditLog`:
- `action`: `BOOKING_CREATED | BOOKING_UPDATED | BOOKING_DELETED`
- `changes`: JSON snapshot — `{ booking }` on create, `{ before, after }` on update

Tenant profile updates also log to `AuditLog` with `action = TENANT_UPDATED`.

### Bulk Operations

- `bulkImportBookings`: accepts up to 500 bookings. Invalid rows (nights ≤ 0) are silently skipped.
- `bulkDeleteBookings`: deletes by ID array, always scoped to `tenantId`.

---

## Rooms

- Each tenant starts with 5 default rooms: `A1`, `A2`, `A3`, `A4`, `A5`
- Rooms can be added (`addRoom`) or removed (`removeRoom`) via mutations
- Room names must be unique per tenant
- Rooms are stored as a JSON column on the `Tenant` record (not a separate table)

---

## Reports

All reports are computed on-the-fly from booking data (no pre-aggregated tables).

### Occupancy Report (`getOccupancyReport`)

- Counts nights occupied for a given `room` (or all rooms) in a calendar month
- Excludes `CANCELED` bookings
- `occupancyRate = occupiedNights / totalNights × 100`
- `totalNights = daysInMonth × numberOfRooms` (hardcoded to 5 if no specific room selected)

### Revenue Report (`getRevenueReport`)

- Filters bookings by `createdAt` (not `checkIn`) in the given year/month
- Sums `totalPrice`, `deposit`, `remaining`
- Computes `averageBookingValue = totalRevenue / bookingCount`

### Guest Statistics (`getGuestStatistics`)

- `totalGuests` = total booking count
- `uniqueCities` = distinct non-null city values
- `averageNightStay` = average `nights` per booking
- `repeatGuestRate` = `(totalBookings - uniqueGuestNames) / totalBookings × 100`
- `cancellationRate` = `canceledBookings / totalBookings × 100`

---

## Offline Mode

The FE has three data backends, checked in priority order:

1. **GraphQL** (when `VITE_GRAPHQL_URL` is set and server reachable)
2. **Supabase** (when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set)
3. **Dexie / IndexedDB** (always available, local browser storage)

`isCloud` in `dataService.ts` is `true` only when `VITE_GRAPHQL_URL` is set. In that mode, the app always tries GraphQL first and syncs results to local Dexie as a cache.

When the server is unreachable (network error), `authService` falls back to local Dexie for reads. Writes will fail silently or throw if the server is required.
