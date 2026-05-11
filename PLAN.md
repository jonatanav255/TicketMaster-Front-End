# Ticketmaster Clone — Front-End Implementation Plan

**Stack:** React 18 + TypeScript + Vite, TanStack Query, Tailwind CSS, native WebSocket API, Zustand for client state.
**Purpose:** Drive and visualize the back-end's distributed-systems behavior — concurrent reservations, real-time seat updates via WebSocket, CDC-driven search, async webhook confirmation.

The front-end is intentionally simple. Per the project context: *"Don't build a fancy frontend. A simple HTML page that demonstrates WebSocket updates is enough."* This plan delivers a clean, working app — not a polished consumer product — and reaches MVP in **3 weeks** while the back-end is still being built.

---

## 0. Guiding Principles

- **Surface the distributed-systems behavior.** The seat map should make lock contention, real-time updates, and async confirmation *visible*. Show timestamps, status badges, and "you vs others" reservations.
- **No over-engineering.** No SSR, no Next.js, no design system. Vite + React + Tailwind is plenty.
- **Track every server interaction.** A small dev console panel showing recent API calls, WS messages, and request IDs makes debugging the back-end trivial.
- **Mockable.** Until back-end Phase 2 lands, run against a fake API (MSW). This unblocks UI work in week 1.
- **Mobile-passable, not mobile-first.** A responsive grid that works on phones is fine; no native app.

---

## 1. Repository Layout

```
TicketMaster-Front-End/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.cjs
├── .env.example                # VITE_API_URL, VITE_WS_URL
├── README.md
├── PLAN.md                     # this file
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx              # React Router routes
│   │
│   ├── api/
│   │   ├── client.ts           # fetch wrapper, X-Request-ID, error mapping
│   │   ├── idempotency.ts      # generate Idempotency-Key per booking attempt
│   │   ├── events.ts           # search + detail
│   │   ├── inventory.ts        # section seats
│   │   ├── bookings.ts         # POST/DELETE/confirm
│   │   └── types.ts            # shared response types (mirror back-end)
│   │
│   ├── ws/
│   │   ├── useEventSocket.ts   # subscribe to /ws/events/:id/seats
│   │   └── reconnect.ts        # exponential backoff
│   │
│   ├── state/
│   │   ├── auth.ts             # mock JWT in localStorage
│   │   ├── cart.ts             # currently-selected ticket_ids (Zustand)
│   │   └── booking.ts          # active pending booking + countdown
│   │
│   ├── features/
│   │   ├── search/
│   │   │   ├── SearchPage.tsx
│   │   │   ├── EventCard.tsx
│   │   │   ├── Filters.tsx
│   │   │   └── useSearch.ts
│   │   ├── event/
│   │   │   ├── EventDetailPage.tsx
│   │   │   ├── SectionPicker.tsx
│   │   │   └── EventHeader.tsx
│   │   ├── seats/
│   │   │   ├── SeatMap.tsx          # the headline component
│   │   │   ├── Seat.tsx
│   │   │   ├── seatStatusReducer.ts # merges REST snapshot + WS deltas
│   │   │   └── legend.tsx
│   │   ├── booking/
│   │   │   ├── CheckoutDrawer.tsx
│   │   │   ├── ReservationCountdown.tsx
│   │   │   ├── PaymentStub.tsx
│   │   │   └── ConfirmationPage.tsx
│   │   ├── user/
│   │   │   └── MyBookingsPage.tsx
│   │   └── devconsole/
│   │       ├── DevConsole.tsx      # floating panel
│   │       ├── apiLog.ts
│   │       └── wsLog.ts
│   │
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Spinner.tsx
│   │   └── StatusBadge.tsx
│   │
│   ├── lib/
│   │   ├── format.ts           # money, dates
│   │   ├── time.ts             # countdown hook
│   │   └── correlation.ts      # request id generator
│   │
│   ├── styles/
│   │   └── index.css           # Tailwind directives + a few CSS vars
│   │
│   └── mocks/                  # MSW handlers used until back-end is ready
│       ├── browser.ts
│       ├── handlers.ts
│       └── fixtures.ts
│
├── public/
│   └── favicon.svg
│
└── tests/
    ├── unit/                   # Vitest + RTL
    │   ├── seatStatusReducer.test.ts
    │   └── countdown.test.ts
    ├── component/              # RTL with MSW
    │   ├── SeatMap.test.tsx
    │   └── CheckoutDrawer.test.tsx
    └── e2e/                    # Playwright
        ├── booking-happy-path.spec.ts
        ├── real-time-seat-update.spec.ts   # two browser contexts
        └── reservation-conflict.spec.ts
```

---

## 2. Tech Choices (Locked)

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite** | Fast, minimal config |
| Framework | **React 18 + TypeScript** | Doc recommends |
| Routing | **React Router v6** | No SSR needed |
| Server cache | **TanStack Query** | Stale-while-revalidate matches cache-aside back-end |
| Client state | **Zustand** | Cart + active booking, no Redux ceremony |
| Styling | **Tailwind CSS** | No bespoke design system |
| Forms | Native `<form>` + zod | One small dependency for shared types |
| WebSocket | Native `WebSocket` + small wrapper | No socket.io; back-end uses raw `ws` |
| Mock API | **MSW** | Runs in dev and tests |
| Testing | **Vitest + React Testing Library + Playwright** | Same Vitest as back-end |
| Lint/format | ESLint + Prettier | Match back-end config |

---

## 3. Page & Route Map

```
/                       SearchPage         (Phase 1) GET /events
/events/:eventId        EventDetailPage    (Phase 1) GET /events/:id + section picker
/events/:eventId/:sec   SectionSeatMap     (Phase 2) GET seats + WS subscribe
/checkout/:bookingId    CheckoutDrawer     (Phase 3) live countdown + POST confirm
/bookings/:bookingId    ConfirmationPage   (Phase 3) status polling for confirmed/failed
/me/bookings            MyBookingsPage     (Phase 4) GET /users/me/bookings
```

Auth gate: a tiny "Sign in as test user" screen issues a mocked JWT and stores it in `localStorage`. No real auth.

---

## 4. The Core UX Flow

1. **Search.** User types a query / picks city → list of events.
2. **Event detail.** Pick a section.
3. **Seat map.**
   - Initial REST snapshot fills the grid.
   - WebSocket connects to `/ws/events/:id/seats`; reducer merges incoming `seat_status_changed` events.
   - Seat colors: green (available), yellow (held by someone else), blue (in your cart), red (sold).
   - You can select up to 8 contiguous seats; click "Reserve" → `POST /bookings`.
4. **Checkout drawer.**
   - Shows your booking with a **10-minute countdown** (`expires_at` from server, not client clock).
   - "Pay" button → `POST /bookings/:id/confirm`.
   - Status flips from `pending` → `processing`; UI starts polling (or, stretch, subscribes to a WS booking channel) until `confirmed` / `failed`.
5. **Confirmation page.** Shows tickets with seat details; "Back to events" CTA.
6. **My bookings.** List the user's confirmed bookings.

**Edge cases the UI must handle (and visibly indicate):**
- `409 SEATS_UNAVAILABLE` on `POST /bookings` → highlight the conflicting seats in red, toast "Someone reserved that seat — pick another."
- WebSocket disconnect → small "Reconnecting…" banner; on reconnect, refetch REST snapshot to reconcile.
- Booking countdown reaches 0 → drawer auto-closes, seats released.
- Page refresh during pending booking → restore from server via `GET /bookings/:id` (don't trust localStorage timer).
- Webhook delayed (Phase 6) → "Finalizing payment…" spinner with a 30s timeout that surfaces a "Still processing — check back" message.

---

## 5. Phase-by-Phase Plan

Each phase is one week and is independently demoable.

### Phase 1 — Foundation & Search (week 1, parallel with back-end Phase 1)

Goal: search and browse events against a mocked API; routing scaffold is in place.

Tasks:
1. Vite + React + TS + Tailwind scaffold, ESLint/Prettier matching back-end.
2. `api/client.ts` — fetch wrapper that:
   - Generates `X-Request-ID` per call.
   - Attaches `Authorization: Bearer <mock-jwt>`.
   - Maps non-2xx to typed errors (`SeatsUnavailableError`, etc).
   - Logs to `devconsole/apiLog`.
3. MSW handlers for `/events`, `/events/:id`, `/events/:id/sections/:section/seats` with fixture data matching the back-end schema.
4. `SearchPage` + `EventCard` + simple `Filters` (city, date, category, text).
5. `EventDetailPage` + `SectionPicker`.
6. Floating DevConsole panel toggled with `?` key — shows recent API calls.
7. Unit tests for `client.ts` retry/error mapping.

**Demo:** browse mock events, navigate to an event, see section list.

---

### Phase 2 — Seat Map & WebSocket (week 2, parallel with back-end Phase 2–4)

Goal: seat map renders + updates in real time. Reservation submits but doesn't yet confirm.

Tasks:
1. `SeatMap.tsx` — CSS grid render of one section. ~100 seats fits a screen.
2. `seatStatusReducer.ts` — pure function merging the initial REST snapshot with WS deltas. Handles out-of-order messages by trusting only the most recent timestamp per ticket.
3. Selection model in Zustand cart store (max 8, contiguous-row warning).
4. `useEventSocket.ts`:
   - Open `WebSocket` on mount, close on unmount.
   - Exponential backoff reconnect (1s → 30s cap).
   - On reconnect, trigger a TanStack Query `invalidate` for the section so we re-sync.
5. `POST /bookings` integration with `Idempotency-Key` (UUID, persisted in component state so a re-click doesn't double-submit).
6. Optimistic UI: clicked seats turn blue immediately; on 409, revert + toast + highlight conflicting ticket_ids.
7. DevConsole "WS" tab — incoming messages with timestamps.

**Demo:** open two browser tabs against the back-end (or MSW with a hand-fired WS), reserve in one tab, watch the other tab's seat go yellow.

**Tests:**
- `seatStatusReducer.test.ts` — out-of-order + idempotent merges.
- Playwright `real-time-seat-update.spec.ts` — two browser contexts, one reserves, the other sees the change.

---

### Phase 3 — Checkout, Countdown & Confirmation (week 3, parallel with back-end Phase 2 + 6)

Goal: full booking lifecycle from reserve → pay → confirmed.

Tasks:
1. `CheckoutDrawer.tsx` — slides in from right on a successful `POST /bookings`. Shows seats, total, countdown.
2. `ReservationCountdown.tsx`:
   - Compute from server-provided `expires_at`, not from client `Date.now()` at click time. Recompute on tab focus.
   - At 0, fire `DELETE /bookings/:id` (or just close the drawer if server already expired it) and reset cart.
3. `PaymentStub.tsx` — "Pay with mock card" button → `POST /bookings/:id/confirm`.
4. `ConfirmationPage.tsx`:
   - If status is `processing`, poll `GET /bookings/:id` every 1s (capped at 30s).
   - On `confirmed`: render tickets + "Add to calendar" stub.
   - On `failed`: show reason + "Try again" CTA.
5. Error UX: handle 409 from confirm (lock expired), network error mid-confirm (show "We're checking — don't reload" + poll).

**Demo:** end-to-end booking against back-end Phase 6 (with mock webhook); the UI sits in `processing` for ~2s then flips to `confirmed`.

**Tests:**
- `CheckoutDrawer` countdown unit test (mocked timers).
- Playwright `booking-happy-path.spec.ts` and `reservation-conflict.spec.ts`.

---

### Phase 4 — My Bookings & Polish (week 4)

Goal: nice-to-haves and stress-test rough edges.

Tasks:
1. `MyBookingsPage` — list confirmed bookings, expand to see ticket detail.
2. "Cancel pending" button on any pending bookings → `DELETE /bookings/:id`.
3. Toast system for global notifications (network errors, conflict, payment status).
4. Loading skeletons for SeatMap and Search list.
5. Accessibility pass: keyboard navigation for the seat map (arrow keys move focus, space selects), ARIA labels with seat + status.
6. Light/dark theme toggle (Tailwind + CSS vars).

---

### Phase 5 — Stretch (only if back-end Phase 7 lands)

- **Virtual waiting room UI.** Full-screen "You're #347 in line, estimated 2 min" page that polls or holds a WS connection to a waiting-room channel.
- **Live metrics overlay.** Hidden dev panel that fetches `/metrics` (proxied through back-end), parses Prometheus text, and shows current Redis lock contention as a sparkline.
- **Optimistic-concurrency demo mode.** A toggle in DevConsole that switches the booking endpoint between the Redis-lock and optimistic-concurrency versions, side-by-side conflict rates.

---

## 6. Component Contracts (Critical Ones)

### `SeatMap`
```ts
type SeatMapProps = {
  eventId: string;
  section: string;
  seats: Seat[];                       // REST snapshot
  myCart: Set<string>;                 // ticket_ids
  onToggleSelect: (ticketId: string) => void;
  conflictingTicketIds?: string[];     // briefly flash red after 409
};
```
Subscribes to the event WS via `useEventSocket(eventId)`; merges deltas via `seatStatusReducer`. Re-renders only the changed seats (memoized `Seat` by `(ticketId, status, isMine)`).

### `useEventSocket`
```ts
function useEventSocket(eventId: string): {
  status: 'connecting' | 'open' | 'reconnecting' | 'closed';
  lastMessage: SeatStatusMessage | null;
  onMessage: (cb: (m: SeatStatusMessage) => void) => () => void;
};
```
Owns the single WebSocket per `eventId`. Multiple `SeatMap` instances on one page share via a module-level Map (keyed by eventId).

### Booking API client
```ts
async function createBooking(args: {
  eventId: string;
  ticketIds: string[];
}): Promise<{ bookingId: string; expiresInSeconds: number }>;
// Throws SeatsUnavailableError({ unavailableTicketIds }) on 409.
// Always sends Idempotency-Key.
```

---

## 7. State Management Boundaries

| State | Lives in | Why |
|---|---|---|
| Event list, event detail, seats snapshot | TanStack Query cache | Server-owned, refetched, dedup'd |
| Selected seats (cart) | Zustand | Pure client UI state |
| Active pending booking + countdown | Zustand, hydrated from server `GET /bookings/:id` | Survives navigation but server is source of truth |
| Mock auth token | localStorage + Zustand mirror | Persistence across refresh |
| DevConsole logs | Zustand (in-memory, ring buffer of 200) | Dev tool only |

Anti-pattern guard: WS messages do NOT write to TanStack Query cache directly. They go through `seatStatusReducer` into a derived view; QC remains the snapshot, the reducer applies deltas. On reconnect we refetch the snapshot and reset the delta log. Keeps the "snapshot vs stream" split explicit.

---

## 8. Working Against an In-Progress Back-End

You'll be ahead of the back-end most of the time. MSW handlers provide a complete fake API from day one and are updated to match each back-end phase.

| Front-end phase | Back-end available? | Solution |
|---|---|---|
| 1 (search/detail) | Maybe Phase 1 | MSW for both modes; one env var swaps real ↔ mock |
| 2 (seat map + WS) | Phase 4 needed | Until then, run a tiny local `ws` echo server in `mocks/ws-server.ts` that emits synthetic seat changes on a timer |
| 3 (checkout) | Phase 2 minimum; Phase 6 ideal | Until Phase 6, MSW returns `confirmed` synchronously on confirm |
| 4 (my bookings) | Phase 2 | Real |

`VITE_USE_MOCKS=true` in `.env.local` enables MSW; defaults to real API in any other env.

---

## 9. Testing Strategy

**Unit (Vitest + RTL):**
- `seatStatusReducer.test.ts` — main invariant: applying messages in any order with the same final set yields the same state if you sort by timestamp.
- `countdown.test.ts` — drift, tab-blur, server-skew handling.
- `idempotency.test.ts` — same key reused on retry.

**Component (RTL + MSW):**
- `SeatMap.test.tsx` — renders snapshot, applies a delta, click toggles selection, 409 highlights conflicts.
- `CheckoutDrawer.test.tsx` — countdown reaches 0 → drawer closes; pay button triggers confirm.

**E2E (Playwright):**
- `booking-happy-path.spec.ts` — search → event → seats → reserve → pay → confirmation.
- `real-time-seat-update.spec.ts` — two browser contexts; A reserves, B sees yellow.
- `reservation-conflict.spec.ts` — two contexts try the same seat simultaneously; the loser gets a clear UI signal.

Run against `VITE_USE_MOCKS=true` in CI; run a subset against a `docker-compose up` back-end in a nightly job.

---

## 10. Performance & Accessibility Budget

- **First contentful paint** < 1.5s on a cold reload of `/`.
- **Seat map render** < 100ms for 500 seats; memoize `Seat` and use CSS grid (no per-seat React reconciliation on hover).
- **WS message → UI update** < 50ms p95 measured from `receivedAt` to `requestAnimationFrame` callback.
- **A11y:** every interactive seat has `role=button`, `aria-label="Section A Row 1 Seat 5, available, $150"`, keyboard nav works.

---

## 11. Definition of Done

1. Browse events, view detail, see seat grid update in real time across two browser tabs.
2. Reserve seats → 10-minute countdown ticks down from server-provided `expires_at`.
3. Pay → drawer shows `processing` → flips to `confirmed` when webhook lands.
4. 409 on a contested seat surfaces a clear, recoverable UI state (no white screen).
5. WebSocket disconnect shows a banner; on reconnect, snapshot reconciles correctly.
6. Playwright `booking-happy-path` and `real-time-seat-update` pass in CI.
7. README has a screencast (gif) of the two-tab seat-update demo — the single most compelling artifact of the project.

---

## 12. First-Week Concrete Checklist

Day 1: Vite scaffold, Tailwind, router, env config, `.env.example`, README placeholder.
Day 2: `api/client.ts` with request IDs + DevConsole API tab.
Day 3: MSW handlers + fixtures matching back-end schema; `SearchPage` against mocks.
Day 4: `EventDetailPage` + `SectionPicker`; navigation working end-to-end.
Day 5: Begin `SeatMap` against static fixture; static styling for all four seat states.
Day 6: Mock WS server (`mocks/ws-server.ts`) + `useEventSocket` hook; deltas update the map.
Day 7: Write the first Playwright happy-path test (against mocks); set up CI.
