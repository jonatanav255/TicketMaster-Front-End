# TicketMaster Front-End — Virtual Waiting Room

A thin React UI that drives the back-end's queue and admission flow.

The full spec is in [`PLAN.md`](./PLAN.md). The working agreement is in [`CLAUDE.md`](./CLAUDE.md). Companion back-end repo: `../TicketMaster-Back-End`.

## Stack

- React 19 + TypeScript + Vite
- React Router v7
- Native `WebSocket` + native `fetch`
- Plain CSS

## Setup

```bash
pnpm install
cp .env.example .env  # already has sensible defaults pointing at localhost:3000
```

## Run

First make sure the back-end is running. In the back-end repo:

```bash
docker compose up -d
pnpm dev        # terminal 1: API + WS
pnpm worker     # terminal 2: admission worker (drains the queue)
```

Then in this repo:

```bash
pnpm dev        # opens on http://localhost:5173
```

## End-to-end test

1. Open `http://localhost:5173/`.
2. Type a name, click "Join the line."
3. The waiting room opens. You see your live position via WebSocket.
4. (Optional) In a third BE terminal: `pnpm seed` — fills the queue with 100 fake users so you can see the position tick down for real.
5. When the worker admits you, the page auto-navigates to `/in/event-1` and shows "You're in."
6. Close the tab and revisit `/in/event-1` — without the session token you get the "pass expired" screen.

## Routes

| Path                 | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `/`                  | Join page — enter a name, get added to the queue   |
| `/queue/:eventId`    | Waiting room — live position + admission listener  |
| `/in/:eventId`       | Admitted page — calls protected BE route with JWT  |

## Env vars

See `.env.example`:

- `VITE_API_URL` — http URL of the back-end (default `http://localhost:3000`)
- `VITE_WS_URL`  — ws URL of the back-end (default `ws://localhost:3000`)

Vite only exposes vars prefixed with `VITE_` to the browser.

## Project layout

```
src/
├── admitted/      AdmittedPage + sessionStorage hook for the JWT
├── api/           thin fetch wrapper + admitted endpoint call
├── queue/         JoinPage, WaitingRoom, useQueueSocket, PositionDisplay
├── shared/        env loader, format helpers
├── App.tsx        router
├── main.tsx       entry point
└── styles.css     all styles
```

## Out of scope

Per `PLAN.md`: no Tailwind, no TanStack Query, no Zustand, no MSW, no Playwright, no real auth. This is a thin testing UI that proves the back-end's distributed-systems patterns work end-to-end, not a polished consumer product.
