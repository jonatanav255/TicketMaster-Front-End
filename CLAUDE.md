# CLAUDE.md — Working Agreement (Front-End)

This file is the **canonical source of truth** for how the AI assistant and the developer collaborate on this project. It lives in the repo so it's versioned, visible to humans, and re-loaded automatically by Claude Code in every session.

`PLAN.md` describes **what** we're building. This file describes **how** we work on it.

---

## 1. Project Context (One Paragraph)

This is the front-end companion to the Ticketmaster-style ticketing back-end at `../TicketMaster-Back-End`. Its purpose is to **drive and visualize the back-end's distributed-systems behavior** — concurrent reservations, real-time seat updates via WebSocket, CDC-driven search, async webhook confirmation. It is intentionally simple: a clean, working React app, not a polished consumer product. Stack: React 18 + TypeScript + Vite + Tailwind, TanStack Query, Zustand, MSW for mocking the back-end while it's under construction. Full detail: `PLAN.md`.

A companion back-end repo lives at `../TicketMaster-Back-End` with its own `PLAN.md` and `CLAUDE.md`. Work alternates between the two.

---

## 2. The Pacing Rule — One File at a Time

Implement **exactly one file per turn**, then stop and wait.

- Tiny config files (≤5 lines, e.g. `.gitignore`, `.env.example`) MAY be bundled with the next real file so we don't stop on trivia. Use judgment; when in doubt, separate.
- Never write speculative files ("we'll need this later"). Only write what the next 30 minutes of work actually requires. **No installing libraries we don't import yet.**
- Before writing the file, state in one sentence what's coming so the developer can redirect cheaply.
- After writing the file, summarize what's in it in plain language. Then ask the questions (see §3).

This is non-negotiable. The point of this project is understanding, and understanding requires checkpoints.

---

## 3. The Quiz Rule — Ask What the File Warrants

After each file, ask **as many questions as the file warrants** — no fixed number.

**Ask a question when:**
- The file contains a field, flag, or value where the alternative would have been reasonable (e.g. Vite vs CRA, Zustand vs Redux, native fetch vs axios).
- A pattern repeats across the project — explaining it once saves many future explanations (e.g. how TanStack Query's stale-while-revalidate works, how React Strict Mode double-invokes effects in dev, how Tailwind's JIT picks up class names).
- A trade-off has real consequences (e.g. WebSocket reconnect strategy, optimistic UI vs wait-for-confirm).

**Skip questions on:**
- Boilerplate where the value is the same in every project (e.g. the `name` field of `package.json`).
- Obvious-from-context choices.

### The Follow-Up Rule (when the developer doesn't know an answer)

When the developer answers a question wrong OR says "I don't know" / "skip" / "explain":

1. **Teach the answer** in plain language. Use an analogy, compare to the alternative, describe what would break without it.
2. **Re-ask a smaller, narrower follow-up** that checks the specific point of confusion. The follow-up must be answerable in one sentence.
   - Example: developer didn't know what React Strict Mode does → after teaching, ask "In dev mode with Strict Mode on, how many times does a `useEffect` with `[]` run when the component mounts?"
   - Example: developer didn't know why we use TanStack Query over plain `useState` + `fetch` → after teaching, ask "If two components mount at the same time and both call `useQuery(['events'])`, how many network requests are made?"
3. If they still miss it, teach once more and move on. **Don't loop.**
4. Acknowledgments like "got it" / "makes sense" do NOT require a follow-up — only re-ask if the developer explicitly engages with the follow-up question.

---

## 4. The Git Rule

- **Never commit or push without an explicit instruction** from the developer ("commit this," "push," "save this").
- **Never add a `Co-Authored-By:` trailer** to commit messages. Use the commit body only.
- Use HEREDOC syntax for commit messages with multiple lines.
- If a push fails (auth, conflict), explain the cause and wait for direction. Don't try to "fix" credentials.

---

## 5. The Tooling Suggestion Rule

The developer wants to know when a **Claude Code hook**, an **MCP server**, a **custom skill**, a **pre-commit hook**, or any other automation could improve our workflow. Examples that might come up in this front-end project:

- A pre-commit hook that runs `tsc --noEmit` and `eslint` to block commits with type/lint errors.
- A custom skill that scaffolds a new feature folder (page + hook + test + MSW handler) with our conventions.
- An MCP server that talks to a running back-end so the AI can verify API shapes match.
- A skill that auto-generates TanStack Query hooks from the back-end's OpenAPI spec (`API.md` when it exists).
- A hook that runs Playwright smoke tests before every push.
- A skill for adding a new MSW handler that matches a back-end route's zod schema.

**The rule:**
- **Flag the suggestion** in 2–3 sentences whenever the moment fits. Be specific: what tool, what problem it solves, what the trade-off is.
- **Never install or configure** any of these without explicit "yes, set it up" from the developer.
- Don't over-suggest. If we already discussed it and declined, don't bring it up again unless circumstances change.

---

## 6. Coding Defaults (Front-End)

Carried in from `PLAN.md` for visibility. Defer to `PLAN.md` for the full reasoning.

- **Language:** TypeScript, strict mode. No `any` without comment justifying why.
- **Build:** Vite (not CRA — deprecated, not Next.js — no SSR needed).
- **Framework:** React 18.
- **Routing:** React Router v6.
- **Server cache:** TanStack Query (stale-while-revalidate matches the back-end's cache-aside pattern).
- **Client state:** Zustand for cart + active booking. No Redux ceremony.
- **Styling:** Tailwind CSS. No bespoke design system.
- **WebSocket:** native `WebSocket` + a small wrapper hook. No socket.io (back-end uses raw `ws`).
- **Mocking:** MSW. Used in dev when `VITE_USE_MOCKS=true` and in tests.
- **Testing:** Vitest + React Testing Library for unit/component, Playwright for E2E (two-browser-context tests are the headline).
- **No comments explaining WHAT.** Code names are the docs. Comments only when the WHY is non-obvious.

---

## 7. Out of Scope (Don't Build These)

The front-end is a **thin testing UI**, not a polished product. Don't propose:

- Server-side rendering (Next.js, Remix).
- Native mobile apps.
- A design system / component library beyond what we need to demo the patterns.
- Real authentication (mock JWT only).
- Real payment forms (the "Pay" button is a button, not a Stripe Elements form).
- Internationalization, accessibility audits beyond keyboard nav + ARIA basics.
- Server-state-replacing global state managers (Redux for what TanStack Query already does).

---

## 8. Package Manager — pnpm only, never npm

**Hard rule:** Use `pnpm` for everything Node-related in this repo. Never run `npm install`, `npm i`, `npm ci`, `npm update`, `npm exec`, `npm run`, `npx`, or any other `npm <subcommand>`.

**Why:** Security. Recent npm supply-chain attacks (Shai-Hulud worm, compromised popular packages, malicious post-install scripts) make pnpm the safer default. pnpm's content-addressable store, strict peer resolution, and isolated `node_modules` reduce blast radius if a malicious package slips in. This is a deliberate defensive choice — do not "fall back" to npm even if a script, tutorial, or docs page suggests it.

**Mapping for common commands:**

| If you would run | Run instead |
|---|---|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npm run <script>` | `pnpm <script>` |
| `npx <bin>` (download) | `pnpm dlx <bin>` |
| `npm update` | `pnpm update` |
| `npm audit` | `pnpm audit` |
| `npm publish` | `pnpm publish` |

**Vite scaffold note:** `pnpm create vite` is the right way to scaffold this app. Don't accept the post-install hint that says `npm install` — use `pnpm install`.

**`npx` exception:** `npx <bin>` is only acceptable when the binary is already a project dependency (resolved from local `node_modules`). For one-off tools that would download a package, use `pnpm dlx <bin>`.

**Lockfile rule:** `pnpm-lock.yaml` is authoritative. If a `package-lock.json` ever appears in this repo, that's a mistake — surface it before deleting.

If a task seems to *require* npm specifically (e.g., reproducing an npm-specific bug), surface it before running npm. Don't silently switch back.

---

## 9. Working Memory Beyond This File

This file is the **canonical** source for working agreements. The AI's private memory (stored outside the repo) should not duplicate the rules here — it should only contain pointers back to this file. If a rule is added or changed, it goes here first, then a memory entry is updated if needed.

When in doubt, **this file wins**.
