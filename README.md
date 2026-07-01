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
- Daily Vercel Cron keepalive that performs a lightweight Supabase read for Free Plan inactivity protection
- Optional multi-phone push notifications when another device adds an expense in the same tracker
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

### Device Notifications
- Notifications are device-based, not login-based: each phone/browser install stores its own push subscription
- Push subscriptions are scoped per tracker (`group_id`) and exclude the device that created the expense
- iPhone/iPad web push requires the PWA to be added to the Home Screen before permission can be granted

### AI Integration
- `/api/parse-expense` sends voice transcript to Claude Haiku
- Returns structured `{ amount, category, date, description }`
- `/api/groups/[id]/insights` aggregates spending data, Claude generates plain-text insights

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
| `/api/groups/[id]/push-subscriptions` | POST, DELETE | Save / remove push subscription for this tracker |
| `/api/parse-expense` | POST | AI voice transcript parsing |
| `/api/cron/keep-supabase-awake` | GET | Protected daily Supabase keepalive |

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
| `components/PushNotificationsToggle.tsx` | Per-device notification toggle for a tracker |
| `worker/index.js` | Custom service worker push and notification click handlers |
| `vercel.json` | Daily Vercel Cron schedule |
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

-- Push subscriptions scoped to tracker and device
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  endpoint text NOT NULL,
  subscription jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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
   CRON_SECRET=
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=
   ```
4. Set the same `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in Vercel project environment variables
5. Run `supabase/schema.sql` in Supabase SQL editor
6. `npm run dev`

## Currency

All amounts are in INR.

## Build Phases

See [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md) for the complete phase-by-phase build history and planned features.
