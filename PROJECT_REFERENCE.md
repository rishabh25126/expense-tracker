# AI Voice Expense Manager — Build Reference

> Current architecture and phase history for the app. Early phases record the original build; Phase 8 replaced user-scoped Supabase Auth with the current single-user, tracker-scoped model. Check current architecture below before using older phase notes.

---

## Project Goal

A voice-first expense tracking web app. User speaks an expense, AI parses it, it gets saved instantly.
Target: expense logged in under 3 seconds.

---

## Tech Stack (Locked)

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + PWA |
| Language | TypeScript (strict mode) |
| PWA | `next-pwa` with service worker + offline support |
| Voice Input | Native browser Web Speech API, fresh recognizer per recording |
| AI Parsing | Anthropic Claude API (claude-haiku-4-5 at runtime) |
| Backend | Next.js API Routes (TypeScript) |
| Database | Supabase (PostgreSQL, free tier) |
| Auth | Single-user `app_session` cookie; username/password from environment variables |
| Hosting | Vercel (free tier) |
| SDK | `@anthropic-ai/sdk` |
| Amount Calculator | `big.js` decimal arithmetic + custom React keypad |
| UI | React Query data cache, `motion` transitions, `lucide-react` controls, responsive dark workspace |

**Runtime AI model:** `claude-haiku-4-5-20251001` for expense parsing and spending insights, as configured in the API routes.

---

## Database Schema

### Table: `groups`
| Column | Type |
|---|---|
| id | uuid (PK) |
| name | text |
| period_start | date |
| prev_period_start | date, nullable |
| created_at | timestamptz |

### Table: `expenses`
| Column | Type |
|---|---|
| id | uuid (PK) |
| group_id | uuid (FK → groups.id) |
| amount | numeric |
| category | text |
| description | text |
| date | date |
| created_at | timestamptz |

### Table: `categories`
| Column | Type |
|---|---|
| id | uuid (PK) |
| group_id | uuid (FK → groups.id) |
| name | text |
| icon | text, nullable; existing categories show initials until an icon is chosen |

**Default categories:** Food, Travel, Rent, Shopping, Bills, Other

### Table: `app_logs` (Phase 20)
| Column | Type |
|---|---|
| id | uuid (PK) |
| level | text |
| message | text |
| metadata | jsonb |
| created_at | timestamptz |

The server accesses Supabase with the service-role key. `supabase/schema.sql` disables RLS and **drops tables before creating them**; run it only for a new database. For an existing database, apply the additive `supabase/migrations/20261014_add_category_icon.sql` to enable icon saving. The migration is versioned in the repo; this document does not assert that it has been applied to a live project.
---

## MVP Features (Build in this order)

### Phase 1 — Project Setup ✅ COMPLETED (commit: b2f161a)
- [x] Create Next.js project with App Router + TypeScript
- [x] Enable strict mode in `tsconfig.json`
- [x] Install dependencies: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `@supabase/ssr`, `next-pwa`
- [x] Configure `next.config.ts` with `next-pwa`
- [x] Create `public/manifest.json`
- [x] Add PWA meta tags in `app/layout.tsx`
- [x] Configure environment-based Supabase and app credentials
- [x] Supabase schema SQL (`supabase/schema.sql`); current schema uses a service-role client without RLS
- [x] Login page + middleware auth guard (no signup flow)

### Phase 2 — AI Parsing API ✅ COMPLETED (commit: 1d4ad96)
- [x] `/api/parse-expense` POST route
- [x] Auth guard (401 if not logged in)
- [x] Claude Haiku prompt → returns `{ amount, category, date, description }`
- [x] Handles today/yesterday date resolution
- [x] Category auto-detection from keywords

### Phase 3 — Voice Input ✅ COMPLETED (commit: 3390ffc)
- [x] `VoiceInput` component using Web Speech API
- [x] Live transcript while speaking
- [x] On stop: sends transcript to `/api/parse-expense`
- [x] Parsed result pre-fills the form

### Phase 4 — Expense Entry ✅ COMPLETED (commit: 3390ffc)
- [x] `/add` page: voice entry → parse → pre-fill form → save
- [x] Manual entry form: amount, category, date, description
- [x] POST to `/api/groups/[id]/expenses` from `/groups/[id]/add`
- [x] Amount required validation, date defaults to today

### Phase 5 — Expense List ✅ COMPLETED (commit: 3390ffc)
- [x] `/groups/[id]/expenses` fetches expenses for the active tracker
- [x] Shows amount, category, date, description
- [x] Edit modal (PATCH), Delete with confirm
- [x] Filter by category (pill buttons)
- [x] Filter by current period or all time

### Phase 6 — Dashboard ✅ COMPLETED (commit: 3390ffc)
- [x] Today's total spending
- [x] Current-period total spending
- [x] Category breakdown for the current period
- [x] Recent 5 expenses

### Phase 7 — Category Management ✅ COMPLETED (commit: 3390ffc)
- [x] `/groups/[id]/categories` lists defaults + tracker-specific custom categories
- [x] Create custom category (POST `/api/groups/[id]/categories`)
- [x] Delete custom category (DELETE `/api/groups/[id]/categories/[cid]`)

### Phase 8 — Auth + Groups + Stats ✅ COMPLETED (commit: fe75dda)
> Cookie-based auth, multi-group trackers, custom periods, stats with charts.

**Credentials:** set via `APP_USERNAME` / `APP_PASSWORD` env vars

**Auth:**
- [x] `app_session` cookie (HttpOnly, 30 days), middleware checks it
- [x] `/login` page + `/api/auth` (POST login, DELETE logout)

**Groups (Trackers):**
- [x] `groups` table (`id, name, period_start, prev_period_start, created_at`)
- [x] `/groups` — list/create trackers
- [x] Expenses and categories fully isolated per group
- [x] Routing: `/groups/[id]/add|expenses|dashboard|stats|categories`

**Session persistence:**
- [x] Middleware sets `last_group` cookie on any `/groups/[id]/*` visit
- [x] Root `/` redirects to last group's add page, or `/groups` if none

**Custom periods (not calendar-based):**
- [x] `period_start` per group — manually set when user starts new period
- [x] `prev_period_start` for undo support
- [x] Stats: "Start New Period" + "Undo" buttons
- [x] All views default to current period; toggle to "All time" available

**Stats (`/groups/[id]/stats`):**
- [x] Period controls, initial statistics, and chart views (later redesigned in Phases 19 and 23)

**Schema:** `supabase/schema.sql` is for a fresh database only; it drops existing tables. Apply additive migrations to existing databases.

**New env vars needed:** `APP_USERNAME`, `APP_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`
(get service role key from Supabase dashboard → Settings → API)

### Phase 9 — Smart Query (AI)
- [ ] Text input: "How much did I spend on food this week?"
- [ ] Claude converts to structured query params
- [ ] Execute query against Supabase
- [ ] Return natural language answer

### Phase 10 — Spending Insights (AI) ✅ COMPLETED
- [x] `/api/groups/[id]/insights` GET route
- [x] Aggregates: period totals, category breakdown, daily (14d), monthly (6m), top expenses
- [x] Claude Haiku prompt → returns up to 5 short spending insights as plain text
- [x] Insights section on `/groups/[id]/dashboard` with loading/error/empty states

### Phase 11 — Deploy ✅ COMPLETED
- [x] Push to GitHub
- [x] Connect to Vercel
- [x] Set environment variables in Vercel dashboard
- [x] Test production voice input (HTTPS via Vercel)

### Phase 12 — Data Layer & Prefetch ✅ COMPLETED
- [x] Integrate React Query across groups, expenses, categories, and insights
- [x] Wrap app with a shared `QueryClientProvider`
- [x] Prefetch group, expenses, and categories in parallel when landing on the Add tab
- [x] Replace `useEffect + fetch` with `useQuery` / `useMutation` and cache invalidation

### Phase 13 — Group Management UX ✅ COMPLETED
- [x] Add inline rename flow for trackers on `/groups`
- [x] Add delete tracker button with confirmation (cascades to expenses & categories via DB)
- [x] Clear deleted group’s cached queries (group, expenses, categories) from React Query
- [x] Strengthen delete confirmations for expenses and trackers

### Phase 15 — Advanced Insights & Alerts (Planned)
- [ ] Deeper AI insights: anomalies (e.g. “Food spend is 40% above your average”)
- [ ] Suggestions: “If you cut 10% from dining, you save ₹X/year”
- [ ] Simple “insights feed” on the dashboard for each group

### Phase 16 — Organization & Search (Planned)
- [ ] Tags for expenses (e.g. `#work`, `#trip-2026`, `#reimbursable`)
- [ ] Fast search across descriptions/categories/tags
- [ ] Saved filters/views (e.g. “Reimbursable work expenses this quarter”)

### Phase 17 — Data Portability & Connectivity ✅ COMPLETED
- [x] Online/offline dot indicator next to "Add Expense" title (green Online / red Offline)
- [x] Voice input mic button disabled when offline with "Voice input disabled — you are offline" message
- [x] CSV export per group / per period (column order: Date, Amount, Category, Description)
- [x] CSV files are **only created and consumed by the web app** (no AI involvement)
- [x] Export button on Expenses page — exports currently filtered view (respects period + category filters)

### Phase 18 — Offline Expense Queue & Auto-Sync ✅ COMPLETED
- [x] `lib/offlineQueue.ts` — localStorage queue scoped per group (`offline_expenses_{groupId}`)
- [x] Manual form works offline — expenses saved to localStorage queue
- [x] Auto-sync: when `online` event fires, queued expenses POST sequentially to API (FIFO)
- [x] Pending count shown on Add page ("2 expenses pending sync" / "Syncing...")
- [x] "Queued!" yellow toast when saving offline, "Queue Expense" button text
- [x] On sync failure: stops at first error, remaining items retry on next online event

### Phase 19 — Advanced Analytics & Visualizations ✅ COMPLETED
- [x] Added `recharts` library for charts (pie, line, bar)
- [x] Shared `lib/chartColors.ts` — color palette + recharts dark theme constants
- [x] **Dashboard**: Category pie chart (recharts PieChart + colored slices)
- [x] **Dashboard**: Top 5 biggest spends in current period (ranked list)
- [x] **Dashboard**: Weekly AI digest (Claude Haiku, 2-3 sentence weekly summary via `?type=digest`)
- [x] **Stats**: Monthly trend line (12 months, recharts LineChart, replaces old CSS MonthlyBars)
- [x] **Stats**: Recharts category bars for the current period
- [x] **Stats**: Period comparison grouped bars (recharts BarChart, current vs previous side-by-side)
- [x] Removed orphaned HBar + MonthlyBars components from stats page
- [x] Removed empty leftover directories (app/auth, app/expenses, app/dashboard, etc.)

### Phase 20 — System Logging & Voice Telemetry ✅ COMPLETED
- [x] `app_logs` database table for application-wide logging
- [x] `lib/logger.ts` updated to write logs direct to Supabase
- [x] Hidden route `/logs` dynamically fetches events and supports filtering via URL Query params.
- [x] End-to-End telemetry for voice flow (start/stop recording, parsing raw chunks, and AI success/failure states)
- [x] Used `react-speech-recognition` for this phase's voice handling; Phase 25 replaces it after iPhone microphone cleanup remained unreliable.
- [x] Force-stop microphone access before starting AI parsing so the phone mic is not kept active while `/api/parse-expense` is in flight

### Phase 21 — Supabase Keepalive Cron ✅ COMPLETED
- [x] Added `vercel.json` daily cron schedule (`30 3 * * *`)
- [x] Added `/api/cron/keep-supabase-awake` GET route
- [x] Route is protected by `CRON_SECRET` via `Authorization: Bearer <secret>`
- [x] Route verifies the expected `x-vercel-cron-schedule` header and does not expose DB error details
- [x] Route performs a lightweight read-only Supabase `groups` table reachability check
- [x] Purpose: reduce Free Plan inactivity pause risk for this personal app

### Phase 22 — Amount Calculator ✅ COMPLETED
- [x] Added `components/AmountCalculator.tsx` bottom-sheet calculator for manual entry
- [x] Amount field on `/groups/[id]/add` has a right-side calculator trigger
- [x] Supports decimal entry and basic operations: add, subtract, multiply, divide
- [x] "Use" writes the computed INR amount back into the Amount field
- [x] Uses `big.js` decimal arithmetic instead of expression evaluation

### Phase 23 — Responsive UI Design System ✅ COMPLETED
- [x] Supabase and Notion inspired dark workspace with emerald actions, readable surfaces, and shared UI tokens
- [x] Responsive safe-area mobile navigation with a centered circular Add action, and desktop side navigation
- [x] Accessible labels, focus states, live status messages, zoom support, and reduced-motion support
- [x] `motion` transitions for navigation and sheets; shared INR and date formatting in `lib/format.ts`
- [x] Cleanup for expense status timers, feedback timeout, speech recognition, and offline sync state after unmount
- [x] Production build, lint, Taste Skill audit, and Playwright responsive interaction checks
- [x] Dedicated default-category icons and selectable per-category icons for new and existing custom categories (choices may repeat)
- [x] Additive `categories.icon` migration in `supabase/migrations/20261014_add_category_icon.sql` (apply to existing databases before using icon selection)

### Phase 24 — Navigation, Data Refresh & Microphone Cleanup ✅ COMPLETED
- [x] Keep tracker navigation mounted in `app/groups/[id]/layout.tsx`, with a route loading state and section-level Stats skeletons
- [x] Share checked group, expense, and category queries with a 30-second stale window; preserve cached content during refresh
- [x] After an expense save or offline sync, refresh groups, tracker, expenses, and categories; invalidate on-demand insights and digest without automatically calling AI endpoints
- [x] Abort Web Speech recognition on Stop, disable/offline, timeout, and unmount so the mic session closes promptly
- [x] Add spacing between Dashboard Top spends and Recent expenses
- [x] Build, lint, delayed-API browser interactions, responsive spacing, and simulated recognition cleanup checks

### Phase 25 — Mobile Voice & Control Refinement ✅ COMPLETED
- [x] Replace the shared speech-recognition manager with a fresh native Web Speech recognizer for each recording
- [x] Abort that exact instance on Stop, final result, navigation, offline/disabled state, page hide, and timeout; clear event handlers and timers
- [x] Use distinct Lucide receipt, dashboard, chart, tag, and plus icons in an icon-only mobile tab bar with larger touch targets, accessible names, and a vertically centered Add circle
- [x] Replace the amount calculator glyph with a recognizable calculator icon
- [x] Verify build and simulated speech lifecycle plus responsive navigation in Playwright; physical iPhone microphone-indicator verification remains device-dependent
- [x] Save the verified mobile Add Expense screenshot at `docs/ui/mobile-add-final.png`

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_USERNAME=
APP_PASSWORD=
CRON_SECRET=
```

---

## PWA Configuration

**`public/manifest.json`** (minimum required):
```json
{
  "name": "AI Voice Expense Manager",
  "short_name": "ExpenseAI",
  "description": "Log expenses by voice in under 3 seconds",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**`next.config.ts`** wraps the Next config with `next-pwa`, registers the service worker, and disables it in development. The manifest and app metadata supply install icons. There is no custom install banner.

---

## AI Parsing Contract

`POST /api/parse-expense` receives `{ text, categories }`. It sends the current date and available default plus custom categories to Claude and requests JSON with `amount`, `category`, `date`, and `description`. The API returns an error for empty text and asks the model for `null` amount when none is spoken. See the route for the exact prompt; do not duplicate it here.

---

## File Structure

```
expenseTrackingApp/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                    # Redirects to last group or /groups
│   ├── login/page.tsx
│   ├── groups/
│   │   ├── page.tsx               # List + create trackers
│   │   └── [id]/
│   │       ├── layout.tsx         # Persistent tracker navigation + shared data prefetch
│   │       ├── loading.tsx        # Route transition skeleton
│   │       ├── add/page.tsx       # Voice + manual expense entry
│   │       ├── expenses/page.tsx  # List with filters + CSV export
│   │       ├── dashboard/page.tsx # Totals + category breakdown + insights
│   │       ├── stats/page.tsx     # Charts + period controls
│   │       └── categories/page.tsx
│   └── logs/page.tsx              # Internal system-log viewer
├── components/
│   ├── VoiceInput.tsx             # Voice input with offline detection
│   ├── AmountCalculator.tsx       # Amount input calculator using big.js
│   ├── CategoryIcon.tsx          # Shared category icon and legacy initials
│   ├── CategoryIconPicker.tsx    # Custom category icon choices
│   ├── GroupNav.tsx               # Bottom nav for group pages
│   ├── OnlineIndicator.tsx        # Green/red online status dot
│   ├── FeedbackButton.tsx
│   └── QueryProvider.tsx          # React Query client provider
├── app/api/
│   ├── auth/route.ts
│   ├── groups/route.ts
│   ├── groups/[id]/route.ts
│   ├── groups/[id]/expenses/route.ts
│   ├── groups/[id]/expenses/[eid]/route.ts
│   ├── groups/[id]/categories/route.ts
│   ├── groups/[id]/categories/[cid]/route.ts
│   ├── groups/[id]/insights/route.ts
│   ├── feedback/route.ts
│   ├── logs/route.ts              # Legacy voice telemetry POST
│   ├── cron/keep-supabase-awake/route.ts
│   └── parse-expense/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts              # Service role client (bypasses RLS)
│   ├── auth.ts
│   ├── logger.ts
│   ├── queryKeys.ts              # React Query cache keys
│   ├── groupQueries.ts           # Shared checked GET queries and mutation refresh
│   ├── csvExport.ts              # Client-side CSV generation
│   ├── offlineQueue.ts           # localStorage offline expense queue
│   ├── chartColors.ts            # Shared color palette + recharts theme
│   ├── categoryIcons.ts          # Icon choices and default mappings
│   └── format.ts                 # INR and date display formatting
├── supabase/migrations/
│   └── 20261014_add_category_icon.sql # Additive migration for existing databases
├── supabase/schema.sql            # Destructive fresh-database schema
├── types/
│   └── index.ts
├── vercel.json                    # Daily Supabase keepalive cron
├── PROJECT_REFERENCE.md            # This file
└── .env.local
```

---

## Types

```typescript
type Expense = {
  id: string;
  group_id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
};

type ParsedExpense = {
  amount: number | null;
  category: string | null;
  date: string | null;
  description: string;
};

type Category = {
  id: string;
  group_id: string;
  name: string;
  icon?: string | null;
};
```

---

## Current Security Model

- `/api/auth` compares `APP_USERNAME` and `APP_PASSWORD`, then sets an HttpOnly `app_session=1` cookie for 30 days. Middleware redirects unauthenticated page visits to `/login`.
- App-facing group, expense, category, feedback, insights, and parse routes call `isAuthed()`. The keepalive route instead requires `CRON_SECRET` and the expected Vercel cron-schedule header. The legacy `/api/logs` POST endpoint is unauthenticated in the current implementation.
- Server-side database calls use the Supabase service-role key and bypass RLS. The schema disables RLS; this is a single-user app, not a Supabase Auth or multi-user setup.
- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain server-side environment variables. Do not commit credential files.

---

## Out of Scope (MVP)

- Bank/SMS import
- OCR receipt scanning
- Multi-user collaboration
- Multi-currency
- WhatsApp integration
- Budget alerts

---

## Build Order Summary

1. Setup (Next.js + Supabase + env vars)
2. AI parse API route
3. Voice input component
4. Expense entry (voice + manual)
5. Expense list (with edit/delete/filter)
6. Dashboard
7. Category management
8. Auth + Groups + Stats (cookie auth, multi-group, custom periods)
9. Smart query (AI) — planned
10. Spending insights (AI)
11. Deploy to Vercel
12. React Query data layer & prefetch
13. Group management UX (rename/delete trackers)
14. —
15. Advanced insights & alerts — planned
16. Organization & search — planned
17. Data portability (offline indicator, CSV export)
18. Offline expense queue & auto-sync
19. Advanced analytics & visualizations (recharts pie, trend line, category bars, digest)
20. System Logging (app logs via hidden /logs UI using GET search queries)
21. Supabase keepalive cron (daily Vercel Cron + protected read-only DB check)
22. Amount calculator for manual expense entry
23. Responsive UI design system, category icons, and browser verification
24. Persistent tracker navigation, shared query refresh, and microphone cleanup
25. Native voice lifecycle and mobile icon controls
