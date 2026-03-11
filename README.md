# AI Voice Expense Manager

A voice-first expense tracking PWA. Speak an expense, AI parses it, it gets saved instantly. Target: expense logged in under 3 seconds.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + TypeScript (strict) |
| PWA | `next-pwa` with service worker + offline support |
| Voice Input | Web Speech API (browser-native) |
| AI Parsing | Anthropic Claude API (`claude-haiku-4-5-20251001`) |
| Database | Supabase (PostgreSQL) |
| Auth | Simple cookie-based (`app_session`, HttpOnly) |
| Hosting | Vercel |
| Data Layer | React Query (`@tanstack/react-query`) |

## Features

- Voice expense entry with AI parsing (amount, category, date, description)
- Manual expense form with category selection
- Multi-group trackers (fully isolated expenses, categories per group)
- Custom period system (not calendar-based) with undo support
- Dashboard with today/period totals, category breakdown, AI spending insights
- Stats page with daily spending chart and category comparison bars
- Category management (defaults + custom per group)
- CSV export (exports filtered view from Expenses page)
- Offline support: online/offline indicator, voice disabled when offline, offline expense queue with auto-sync
- PWA installable on mobile

## Architecture

### Auth
- Cookie auth: `app_session=1` (HttpOnly, 30 days)
- Middleware checks cookie, redirects to `/login` if missing
- Credentials configured via `APP_USERNAME` / `APP_PASSWORD` env vars

### Data Flow
- All API routes use Supabase service role key (bypasses RLS)
- React Query caches data client-side (30s stale time, refetch on focus)
- Expenses and categories scoped by `group_id` (no `user_id` column — single-user)
- Period filtering is client-side: `expenses.filter(e => e.date >= periodStart)`

### Offline Queue
- Expenses saved to `localStorage` when offline (`offline_expenses_{groupId}`)
- Auto-synced sequentially (FIFO) when `online` event fires
- Pending count shown on Add page with sync status

### AI Integration
- `/api/parse-expense` sends voice transcript to Claude Haiku
- Returns structured `{ amount, category, date, description }`
- `/api/groups/[id]/insights` aggregates spending data, Claude generates plain-text insights

## Routing

| Route | Purpose |
|-------|---------|
| `/login` | Login page |
| `/groups` | List + create trackers |
| `/groups/[id]/add` | Voice + manual expense entry |
| `/groups/[id]/expenses` | List with period/category filter + CSV export |
| `/groups/[id]/dashboard` | Today/period totals + category breakdown + AI insights |
| `/groups/[id]/stats` | Daily chart + category bars + period controls |
| `/groups/[id]/categories` | Manage custom categories |

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth` | POST, DELETE | Login / logout |
| `/api/groups` | GET, POST | List / create groups |
| `/api/groups/[id]` | GET, PATCH, DELETE | Get / update period / delete group |
| `/api/groups/[id]/expenses` | GET, POST | List / create expenses |
| `/api/groups/[id]/expenses/[eid]` | PATCH, DELETE | Update / delete expense |
| `/api/groups/[id]/categories` | GET, POST | List / create categories |
| `/api/groups/[id]/categories/[cid]` | DELETE | Delete category |
| `/api/groups/[id]/insights` | GET | AI spending insights |
| `/api/parse-expense` | POST | AI voice transcript parsing |

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Cookie auth + `last_group` persistence |
| `lib/supabase/admin.ts` | Service role Supabase client |
| `lib/auth.ts` | `isAuthed()` helper |
| `lib/queryKeys.ts` | React Query cache keys |
| `lib/csvExport.ts` | Client-side CSV generation |
| `lib/offlineQueue.ts` | localStorage offline expense queue |
| `components/GroupNav.tsx` | Bottom nav for group pages |
| `components/VoiceInput.tsx` | Voice input with offline detection |
| `components/OnlineIndicator.tsx` | Green/red online status dot |
| `supabase/schema.sql` | Database schema |
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
  name text NOT NULL
);
```

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   APP_USERNAME=
   APP_PASSWORD=
   ```
4. Run `supabase/schema.sql` in Supabase SQL editor
5. `npm run dev`

## Currency

All amounts are in INR.

## Build Phases

See [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md) for the complete phase-by-phase build history and planned features.
