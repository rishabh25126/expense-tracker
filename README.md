# AI Voice Expense Manager

A voice-first expense tracking PWA. Speak an expense, AI parses it, it gets saved instantly. Target: expense logged in under 3 seconds.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + TypeScript (strict) |
| PWA | `next-pwa` with service worker + offline support |
| Voice Input | Browser Web Speech API with one native recognizer per recording |
| AI Parsing | Anthropic Claude API (`claude-haiku-4-5-20251001`) |
| Database | Supabase (PostgreSQL) |
| Auth | Simple cookie-based (`app_session`, HttpOnly) |
| Hosting | Vercel |
| Data Layer | React Query (`@tanstack/react-query`) |
| Calculator Math | `big.js` decimal arithmetic |
| UI Motion | `motion` for navigation and sheet transitions |
| UI Icons | `lucide-react` for navigation and calculator controls |

## Features

- Voice expense entry with AI parsing (amount, category, date, description)
- Manual expense form with category selection and an amount-field calculator
- Multi-group trackers (fully isolated expenses, categories per group)
- Custom period system (not calendar-based) with undo support
- Dashboard with today/period totals, category breakdown, AI spending insights
- Stats page with a 12-month trend chart, current-period category bars, and period controls
- Category management (defaults + custom per group, with a selectable icon for each custom category)
- CSV export (exports filtered view from Expenses page)
- Offline support: online/offline indicator, voice disabled when offline, offline expense queue with auto-sync
- Daily Vercel Cron keepalive that performs a lightweight Supabase read for Free Plan inactivity protection
- PWA installable on mobile
- Responsive dark workspace UI with safe-area navigation, accessible forms, and reduced-motion support
- Icon-only mobile navigation with larger tap targets and a centered, vertically aligned emerald Add action; labeled side navigation on larger screens
- Default categories have dedicated icons; each custom category stores a selectable icon that appears beside expense rows (icons may be reused)
- Feedback sheet and internal system-log page

Mobile Add Expense preview (synthetic QA data): [mobile-add-final.png](docs/ui/mobile-add-final.png)

## Architecture

### Auth
- Cookie auth: `app_session=1` (HttpOnly, 30 days)
- Middleware checks cookie, redirects to `/login` if missing
- Credentials configured via `APP_USERNAME` / `APP_PASSWORD` env vars
- There is no signup flow or Supabase Auth session; the app is configured for one user

### Data Flow
- All database access goes through the server-side Supabase service-role client (bypasses RLS)
- React Query caches tracker data client-side for 30 seconds. The tracker layout keeps navigation mounted and prefetches group, expenses, and categories; loading states stay within each section.
- Expense save and offline sync refresh groups, tracker details, expenses, and categories in the background. Insights and digest become stale until the user requests them again.
- Each voice recording owns a fresh native recognition instance. Stop, a final result, going offline, disabling input, timeout, page hide, and leaving Add Expense directly abort that instance before parsing.
- Expenses and categories scoped by `group_id` (no `user_id` column — single-user)
- Period filtering is client-side: `expenses.filter(e => e.date >= periodStart)`
- Custom category icons are stored on the category row. Existing rows without an icon display initials until edited.

### Offline Queue
- Expenses saved to `localStorage` when offline (`offline_expenses_{groupId}`)
- Auto-synced sequentially (FIFO) when `online` event fires
- Pending count shown on Add page with sync status

### AI Integration
- `/api/parse-expense` sends voice transcript to Claude Haiku
- Returns structured `{ amount, category, date, description }`
- `VoiceInput` aborts its native speech recognizer before parsing begins; verify the phone's mic indicator on an actual iPhone when testing a deployment
- `/api/groups/[id]/insights` aggregates spending data, Claude generates plain-text insights
- Feedback is appended to ignored local `feedback.txt`; on serverless hosting, that filesystem may not provide durable storage

### Scheduled Keepalive
- Vercel Cron calls `/api/cron/keep-supabase-awake` once daily at `03:30 UTC`
- The route requires `CRON_SECRET`; Vercel sends it as `Authorization: Bearer <CRON_SECRET>`
- The route also verifies the expected `x-vercel-cron-schedule` header
- The route performs a read-only `groups` table check through the Supabase service role client and returns no database details

## Routing

| Route | Purpose |
|-------|---------|
| `/login` | Login page |
| `/groups` | List + create trackers |
| `/groups/[id]/add` | Voice + manual expense entry |
| `/groups/[id]/expenses` | List with period/category filter + CSV export |
| `/groups/[id]/dashboard` | Today/period totals + category breakdown + AI insights |
| `/groups/[id]/stats` | Monthly trend + category bars + period controls |
| `/groups/[id]/categories` | Manage custom categories and their icons |
| `/logs` | Internal application logs and filters |

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth` | POST, DELETE | Login / logout |
| `/api/groups` | GET, POST | List / create groups |
| `/api/groups/[id]` | GET, PATCH, DELETE | Get / update period / delete group |
| `/api/groups/[id]/expenses` | GET, POST | List / create expenses |
| `/api/groups/[id]/expenses/[eid]` | PATCH, DELETE | Update / delete expense |
| `/api/groups/[id]/categories` | GET, POST | List / create categories |
| `/api/groups/[id]/categories/[cid]` | PATCH, DELETE | Change category icon / delete category |
| `/api/groups/[id]/insights` | GET | AI spending insights |
| `/api/parse-expense` | POST | AI voice transcript parsing |
| `/api/feedback` | POST | Save feedback to ignored local `feedback.txt` |
| `/api/logs` | POST | Legacy voice telemetry endpoint |
| `/api/cron/keep-supabase-awake` | GET | Protected daily Supabase keepalive |

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Cookie auth + `last_group` persistence |
| `lib/supabase/admin.ts` | Service role Supabase client |
| `lib/auth.ts` | `isAuthed()` helper |
| `lib/queryKeys.ts` | React Query cache keys |
| `lib/groupQueries.ts` | Shared checked GET queries and group-data refresh after mutations |
| `app/groups/[id]/layout.tsx`, `loading.tsx` | Persistent tracker navigation and route loading skeleton |
| `lib/csvExport.ts` | Client-side CSV generation |
| `lib/offlineQueue.ts` | localStorage offline expense queue |
| `components/GroupNav.tsx` | Mobile bottom nav and desktop side nav |
| `app/globals.css` | Shared responsive UI tokens, fields, actions, sheets, and focus styles |
| `lib/format.ts` | INR and readable date formatting |
| `lib/categoryIcons.ts` | Category icon choices and default mappings |
| `components/CategoryIcon.tsx`, `components/CategoryIconPicker.tsx` | Shared icon display and custom-category picker |
| `components/VoiceInput.tsx` | Voice input with offline detection |
| `components/AmountCalculator.tsx` | Bottom-sheet amount calculator using decimal-safe arithmetic |
| `components/OnlineIndicator.tsx` | Green/red online status dot |
| `vercel.json` | Daily Vercel Cron schedule |
| `supabase/schema.sql` | Destructive fresh-database schema (drops tables) |
| `supabase/migrations/20261014_add_category_icon.sql` | Safe icon-column migration for existing databases |
| `PROJECT_REFERENCE.md` | Single source of truth for build phases |

## Database Schema

```sql
-- Groups (trackers)
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  prev_period_start date,
  created_at timestamptz DEFAULT now()
);

-- Expenses scoped to group
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  category text NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Custom categories scoped to group
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text
);

-- Application events
CREATE TABLE app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Setup

1. Clone the repo
2. `npm install`
3. Create `.env.local` with these values (there is no committed example file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   APP_USERNAME=
   APP_PASSWORD=
   CRON_SECRET=
   ```
4. For a fresh database only, run `supabase/schema.sql` in the Supabase SQL Editor. **It drops existing tables and data.** For an existing database, run only `supabase/migrations/20261014_add_category_icon.sql` to add custom-category icons.
5. Set the app environment variables in Vercel; configure `CRON_SECRET` there for the daily keepalive.
6. `npm run dev`

The current `NEXT_PUBLIC_SUPABASE_URL` should point to your hosted Supabase project. This repository does not configure a local Supabase stack. `/api/groups` requires a login session; a 401 response without the `app_session` cookie means the route exists. If authenticated requests fail with a TLS `ECONNRESET`, check local DNS/network resolution before changing the env file.

## Currency

All amounts are in INR.

## Build Phases

See [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md) for the complete phase-by-phase build history and planned features.
