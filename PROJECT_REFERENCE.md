# AI Voice Expense Manager — Build Reference

> This file is the single source of truth for building the app step by step.
> Claude must always read and follow this file before generating any code or making decisions.

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
| Voice Input | Web Speech API (browser-native, free) |
| AI Parsing | Anthropic Claude API (claude-haiku-4-5 at runtime) |
| Backend | Next.js API Routes (TypeScript) |
| Database | Supabase (PostgreSQL, free tier) |
| Auth | Supabase Auth |
| Hosting | Vercel (free tier) |
| SDK | `@anthropic-ai/sdk` |

**AI Model Strategy:**
- Development/testing: `claude-sonnet-4-6`
- Runtime expense parsing (production): `claude-haiku-4-5-20251001` (cheaper, faster)

---

## Database Schema

### Table: `users`
| Column | Type |
|---|---|
| id | uuid (PK) |
| email | text |
| created_at | timestamptz |

### Table: `expenses`
| Column | Type |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → users.id) |
| amount | numeric |
| category | text |
| description | text |
| date | date |
| created_at | timestamptz |

### Table: `categories`
| Column | Type |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → users.id) |
| name | text |

**Default categories:** Food, Travel, Rent, Shopping, Bills, Other

---

## MVP Features (Build in this order)

### Phase 1 — Project Setup ✅ COMPLETED (commit: b2f161a)
- [x] Create Next.js project with App Router + TypeScript
- [x] Enable strict mode in `tsconfig.json`
- [x] Install dependencies: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `@supabase/ssr`, `next-pwa`
- [x] Configure `next.config.ts` with `next-pwa`
- [x] Create `public/manifest.json`
- [x] Add PWA meta tags in `app/layout.tsx`
- [x] Configure `.env.local` template
- [x] Supabase schema SQL + RLS policies (`supabase/schema.sql`)
- [x] Login/signup pages + middleware auth guard

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
- [x] POST to `/api/expenses`, redirects to `/expenses`
- [x] Amount required validation, date defaults to today

### Phase 5 — Expense List ✅ COMPLETED (commit: 3390ffc)
- [x] `/expenses` page fetches all user expenses
- [x] Shows amount, category, date, description
- [x] Edit modal (PATCH), Delete with confirm
- [x] Filter by category (pill buttons)
- [x] Filter by date range (from/to)

### Phase 6 — Dashboard ✅ COMPLETED (commit: 3390ffc)
- [x] Today's total spending
- [x] This month's total spending
- [x] Category breakdown for current month
- [x] Recent 5 expenses

### Phase 7 — Category Management ✅ COMPLETED (commit: 3390ffc)
- [x] `/categories` page lists defaults + custom
- [x] Create custom category (POST `/api/categories`)
- [x] Delete custom category (DELETE `/api/categories/[id]`)

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
- [x] Daily spending bar chart (current period, up to last 14 days)
- [x] Category breakdown current vs previous period (CSS horizontal bars)
- [x] Period totals comparison

**Schema — run `supabase/schema.sql` in Supabase SQL editor**

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
- [x] Integrate React Query across groups/expenses/categories/auth/feedback
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
- [x] **Stats**: Spending heatmap (90-day CSS calendar grid, indigo opacity scaled by amount)
- [x] **Stats**: Period comparison grouped bars (recharts BarChart, current vs previous side-by-side)
- [x] Removed orphaned HBar + MonthlyBars components from stats page
- [x] Removed empty leftover directories (app/auth, app/expenses, app/dashboard, etc.)

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
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

**`next.config.ts`** PWA setup:
```typescript
import withPWA from 'next-pwa';

const config = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

export default config;
```

**PWA install prompt:** Show "Add to Home Screen" banner on mobile for native-like experience.

---

## AI Parsing Prompt Template

```
You are an expense parser. Extract structured data from the user's input.

User input: "{raw_text}"

Return ONLY valid JSON with these fields:
{
  "amount": number or null,
  "category": one of [Food, Travel, Rent, Shopping, Bills, Other] or null,
  "date": ISO date string (YYYY-MM-DD) or null (null means today),
  "description": short string summarizing the expense
}

Rules:
- "yesterday" → calculate actual date
- "coffee" → category: Food
- "uber", "fuel", "petrol" → category: Travel
- "rent" → category: Rent
- "electricity", "internet", "bill" → category: Bills
- If amount is missing, return null for amount
- Never return extra text, only JSON
```

---

## File Structure

```
expenseTrackingApp/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Redirects to last group or /groups
│   ├── login/page.tsx
│   ├── groups/
│   │   ├── page.tsx               # List + create trackers
│   │   └── [id]/
│   │       ├── add/page.tsx       # Voice + manual expense entry
│   │       ├── expenses/page.tsx  # List with filters + CSV export
│   │       ├── dashboard/page.tsx # Totals + category breakdown + insights
│   │       ├── stats/page.tsx     # Charts + period controls
│   │       └── categories/page.tsx
├── components/
│   ├── VoiceInput.tsx             # Voice input with offline detection
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
│   └── parse-expense/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts              # Service role client (bypasses RLS)
│   ├── claude.ts
│   ├── queryKeys.ts              # React Query cache keys
│   ├── csvExport.ts              # Client-side CSV generation
│   ├── offlineQueue.ts           # localStorage offline expense queue
│   └── chartColors.ts            # Shared color palette + recharts theme
├── types/
│   └── index.ts
├── PROJECT_REFERENCE.md            # This file
└── .env.local
```

---

## Types

```typescript
type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
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
  user_id: string;
  name: string;
};
```

---

## Security Rules

- All API routes must verify the user's Supabase session before any DB operation
- Never expose `ANTHROPIC_API_KEY` to the client — only call Claude from API routes
- Use Supabase Row Level Security (RLS) — users can only access their own rows
- Rate limit `/api/parse-expense` to prevent abuse

---

## Supabase RLS Policies (apply to all tables)

```sql
-- expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own expenses" ON expenses
  USING (auth.uid() = user_id);

-- categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own categories" ON categories
  USING (auth.uid() = user_id);
```

---

## Cost Estimates (Monthly)

| Service | Cost |
|---|---|
| Vercel hosting | $0 |
| Supabase (free tier) | $0 |
| Web Speech API | $0 |
| Claude Haiku (AI parsing) | ~$0.05 |
| **Total** | **$0 – $0.10** |

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
19. Advanced analytics & visualizations (recharts, pie, trend line, heatmap, comparison, digest)
