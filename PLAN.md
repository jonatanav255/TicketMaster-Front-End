# Virtual Waiting Room — Front-End Build Guide

**Stack:** React + Vite + TypeScript. That's it.

This is a study guide, not a code spec. Each step explains *what you're building* and *why it matters*. You write the code yourself.

The back-end is a sibling repo at `../TicketMaster-Back-End` — see its `PLAN.md` for the contract.

---

## What you'll have at the end

A React app with **two pages**:

1. **`/`** — JoinPage. Type your name, click a button, get sent to the queue.
2. **`/queue/:eventId`** — WaitingRoom. Live position from a WebSocket. Tick down to 0, get a JWT, auto-navigate to:
3. **`/in/:eventId`** — AdmittedPage. Calls a protected back-end endpoint to prove the JWT works.

End-to-end story: name → in line → live position → admitted → protected resource opens.

---

## The big picture (refer back often)

```
                 ┌────────────────────────────────────────────────┐
                 │                React + Vite                    │
                 │                                                │
   /             │   JoinPage  ── name + click ──┐                │
                 │                                ▼               │
   /queue/:id    │   WaitingRoom  ◄── WS ──►  back-end            │
                 │     - live position             ▲              │
                 │     - waits for "admitted"      │              │
                 │                                  │             │
                 │   on admitted:                   │ stash token │
                 │     - store JWT in sessionStorage              │
                 │     - navigate to /in/:id                      │
                 │                                                │
   /in/:id       │   AdmittedPage  ──► fetch /admitted/hello + JWT│
                 │                                                │
                 │   on 200 → "You're in"                         │
                 │   on 401 → "Pass expired, rejoin"              │
                 └────────────────────────────────────────────────┘
```

---

## Phase A — Scaffold

You're standing up an empty Vite + React + TS app with two route placeholders. No real logic yet.

### Step 1 — Run `pnpm create vite`, pick React + TS
**What:** The official scaffold gives you `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`.
**Why:** Don't reinvent the wheel. Trim the boilerplate (delete the spinning React logo, the CSS modules demo) — keep the bones.
**Watch out for:** The default scaffold has its own `App.css` and a counter. Strip both before continuing so you start from a clean slate.

### Step 2 — `.gitignore` + `.env.example`
**What:** Ignore `node_modules`, `dist`, `.env`. `.env.example` documents `VITE_API_URL` and `VITE_WS_URL`.
**Why:** Vite **only exposes env vars prefixed with `VITE_`** to the browser. Anything without that prefix is server-only (and there's no server here, so don't bother). This is a common gotcha.

### Step 3 — Install React Router
**What:** `pnpm add react-router-dom`. Set up routes for `/`, `/queue/:eventId`, `/in/:eventId` with placeholder components.
**Why:** Two routes is the minimum that justifies a router. Anything less, you'd use state; anything more, this scales fine.

### Step 4 — `src/shared/env.ts`
**What:** Read `import.meta.env.VITE_API_URL` and `VITE_WS_URL`, throw a clear error if either is missing, export typed constants.
**Why:** Same idea as the back-end's `config.ts` — fail at startup, not on first API call.

**Phase A demo:** `pnpm dev`, see three pages rendering placeholder text. The router works. Nothing else.

---

## Phase B — Glue

You're building the small utilities every page will use. Boring but worth doing right.

### Step 5 — `src/shared/format.ts`
**What:** `secondsToMinutes(s)` returns strings like `"8m 12s"` or `"45s"`.
**Why:** Centralized formatting = single place to fix it when the design changes. Also makes the function trivially unit-testable.

### Step 6 — `src/api/client.ts`
**What:** A thin `fetch` wrapper. Adds `Content-Type: application/json`, throws on non-2xx, parses JSON. Exports `get()` and `post()`.
**Why:** Every API call uses this. When you eventually need to add an `Authorization` header or a correlation id, you change *one* file.
**Watch out for:** Don't reach for axios. Native `fetch` is fine for a 2-page app and avoids dragging in a dependency.

### Step 7 — `src/admitted/useToken.ts`
**What:** A custom hook with `getToken()`, `setToken(t)`, `clearToken()` backed by `sessionStorage`.
**Why this matters:** `sessionStorage` (not `localStorage`) is scoped to the **tab**. Close the tab → token gone. That's exactly the lifetime you want for a single visit. `localStorage` would persist forever and surprise users.
**Watch out for:** SessionStorage throws in some browser privacy modes. Wrap reads/writes in try/catch and fall back gracefully (treat "no storage" as "no token").

---

## Phase C — JoinPage + WaitingRoom (the heart of the FE)

The WaitingRoom is where the interesting code lives.

### Step 8 — `src/queue/JoinPage.tsx`
**What:** One `<input>` for the name, one `<button>` that:
1. Slugifies the name into a `userId`.
2. POSTs to `${API_URL}/api/v1/queue/event-1/join` with that userId.
3. Stores `userId` in sessionStorage.
4. Navigates to `/queue/event-1`.
**Why:** Real apps would do this with a proper form library + validation. We don't have a form library, we have one field — `useState` + a submit handler is enough.

### Step 9 — `src/queue/useQueueSocket.ts` — the hook
**What:** A custom hook `useQueueSocket(eventId, userId)` that:
- Opens a WebSocket on mount, closes on unmount.
- Reconnects with **exponential backoff** (1s, 2s, 4s, 8s, capped at 15s) on unexpected disconnect.
- Exposes `{ position, etaSeconds, status }` where `status ∈ "connecting" | "open" | "reconnecting" | "closed"`.
- Calls an `onAdmitted(token)` callback when the admission message arrives. Stops reconnecting after that.
**Why this matters (deeply):**
- WebSockets *will* drop — slow networks, sleeping laptops, server restarts. Without reconnect logic the UX is broken every time.
- Exponential backoff is a universal pattern. The first retry should be fast (the connection might have just blipped), subsequent retries should slow down (the server might be down for real).
- The `status` field lets the UI distinguish "we're connecting" from "we're definitely disconnected." A small UX detail that makes the app feel solid.
**Watch out for:**
- **Cleanup in `useEffect` return.** If you forget to close the socket on unmount, navigating away leaks connections.
- **React 18 Strict Mode** double-mounts effects in development. Your effect runs twice on first mount in dev. Either trust your cleanup function to handle it (correct answer) or you'll spend a confusing hour debugging "why is my socket opening twice?"
- Reconnect logic should **not** retry forever after `onAdmitted` — once admitted, the server will close the socket and reconnect attempts would be pointless.

### Step 10 — `src/queue/PositionDisplay.tsx`
**What:** Big centered number. Subtext: `"Estimated wait: ${secondsToMinutes(etaSeconds)}"`. A small colored dot for connection status (green/yellow/red).
**Why:** Pure presentational component. No fetching, no WebSocket — just props in, JSX out. Easy to style, easy to test, easy to reuse.

### Step 11 — `src/queue/WaitingRoom.tsx`
**What:** Reads `eventId` from URL, reads `userId` from sessionStorage (redirect to `/` if missing). Calls `useQueueSocket()`. Renders `<PositionDisplay />` with the hook's state. On `onAdmitted(token)`: store token in sessionStorage, navigate to `/in/:eventId`.
**Why:** This is the **container/presenter** split in miniature. WaitingRoom orchestrates; PositionDisplay just renders. Easier to reason about than putting it all in one file.

**Phase C demo:** With the back-end running, enter a name, watch a number tick down live. No styling needed yet — function first.

---

## Phase D — AdmittedPage (proving the token works)

### Step 12 — `src/api/admitted.ts`
**What:** One function `fetchHello(token)` that calls `GET /api/v1/admitted/hello` with `Authorization: Bearer ${token}`.
**Why:** Keeps the API call separate from the React component. Easier to mock later if you decide to add tests.

### Step 13 — `src/admitted/AdmittedPage.tsx`
**What:** On mount: read the token, call `fetchHello()`. While loading: show a spinner. On success: `You're in! Hello, <userId>.` On 401: `Your pass expired or is invalid.` with a link back to `/`.
**Why:** This page is the **other side** of the capability-token contract. It demonstrates that the JWT alone is sufficient — there's no session, no cookies, no DB lookup. The token *is* the authorization.

### Step 14 — `src/styles.css`
**What:** Plain CSS. Center the position number, large font for the number, comfortable spacing. ~30 lines.
**Why:** Two pages don't need Tailwind. Resist the urge.

**Phase D demo:** Full happy path. Name → queue → tick down → admitted → "You're in." Refreshing `/in/event-1` after 5 minutes shows the "pass expired" message.

---

## Phase E — Wrap-up

### Step 15 — `README.md`
**What:** "How to run": `pnpm install`, `pnpm dev`, point to back-end repo for the server side.
**Why:** Future-you will be grateful.

### Step 16 — Quick tests (optional)
**What:** Vitest tests for `format.ts` and `useToken.ts`.
**Why:** These are the only two files with pure logic worth pinning down. Everything else is React glue.

---

## Definition of done

1. ✅ Enter a name → land in the waiting room with a real position from Redis.
2. ✅ Position updates live (every ~2s) without page refresh.
3. ✅ Disconnect the network for 5 seconds, reconnect — the page resumes (not white-screen).
4. ✅ When the worker admits you, the page auto-navigates to `/in/event-1`.
5. ✅ `/in/event-1` shows your name + event id from the protected endpoint.
6. ✅ Manually expire the token (or wait 5 minutes), refresh `/in/event-1` → graceful "rejoin the line" message.

---

## Explicitly out of scope

- No Tailwind, no design system, no theme toggle. Plain CSS.
- No TanStack Query. One fetch, one WebSocket — `useState`/`useEffect` is plenty.
- No Zustand or Redux. SessionStorage + local state covers everything.
- No MSW. Run against the real back-end next door.
- No Playwright/E2E. Manual demo is enough for this slice.
- No login, no event list, no seat map, no checkout. **One** hard-coded event id: `event-1`.

If a "feature idea" tempts you mid-build, write it down somewhere else and come back to this slice. The point is to learn the pattern deeply, not to build a product.
