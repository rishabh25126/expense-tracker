# AI Voice Expense Manager

A voice-first expense tracking PWA. Speak an expense, AI parses it, it gets saved instantly. Target: expense logged in under 3 seconds.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + TypeScript (strict) |
| PWA | `next-pwa` with service worker + offline support |
| Voice Input | `react-speech-recognition` |
| AI Parsing | Anthropic Claude API (`claude-haiku-4-5-20251001`) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Hosting | Vercel |
| Data Layer | React Query (`@tanstack/react-query`) |

## Features

- Voice expense entry with AI parsing (amount, category, date, description)
- Manual expense form with category selection
- Multi-user group trackers with password-protected join codes
- Expenses identify who added them, with creator color coding
- In-app unread notification toast plus optional PWA push alerts for expenses added by other members
- Profile page for display name, transaction color, password, and push settings
- Custom period system (not calendar-based) with undo support
- Dashboard with today/period totals, category breakdown, AI spending insights
- Stats page with daily spending chart and category comparison bars
- Category management (defaults + custom per group)
- CSV export (exports filtered view from Expenses page)
- Offline support: online/offline indicator, voice disabled when offline, offline expense queue with auto-sync
- Daily Vercel Cron keepalive that performs a lightweight Supabase read for Free Plan inactivity protection
- PWA installable on mobile

## Architecture

### Auth
- Supabase Auth sessions are stored in cookies through `@supabase/ssr`
- Login supports email/password, open signup, and Google OAuth callback at `/auth/callback`
- Middleware validates the Supabase user and redirects unauthenticated page visits to `/login`
- Profile records store display name, email, and transaction color

### Data Flow
- API routes verify the current Supabase user, then use the service role key with explicit membership checks
- Public tables have RLS enabled as defense in depth
- React Query caches data client-side (30s stale time, refetch on focus)
- Groups are joined by shareable `join_code` + server-hashed group password
- Expenses and categories are scoped by `group_id`; expenses also store `created_by`
- Period filtering is client-side: `expenses.filter(e => e.date >= periodStart)`

### Notifications
- Expense creation writes unread `notifications` rows for other members of the same group
- On app open, unread expense notifications show a toast with `View expenses` and `Dismiss`
- Optional PWA push uses `push_subscriptions` and VAPID env vars; if VAPID keys are missing, in-app notifications still work
- Email notifications are not implemented in this phase

### Offline Queue
- Expenses saved to `localStorage` when offline (`offline_expenses_{groupId}`)
- Auto-synced sequentially (FIFO) when `online` event fires
- Pending count shown on Add page with sync status

### AI Integration
- `/api/parse-expense` sends voice transcript to Claude Haiku
- Returns structured `{ amount, category, date, description }`
- `VoiceInput` force-stops speech recognition before parsing begins so the phone mic is not left active during AI parsing
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
| `/profile` | Edit display name, password, transaction color, push notifications |
| `/groups` | List + create trackers |
| `/groups/[id]/add` | Voice + manual expense entry |
| `/groups/[id]/expenses` | List with period/category filter + CSV export |
| `/groups/[id]/dashboard` | Today/period totals + category breakdown + AI insights |
| `/groups/[id]/stats` | Daily chart + category bars + period controls |
| `/groups/[id]/categories` | Manage custom categories |

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth` | POST, DELETE | Email/password login compatibility / logout |
| `/api/me` | GET | Current user + profile |
| `/api/profile` | GET, PATCH | Profile, transaction color, password update |
| `/api/groups` | GET, POST | List / create groups |
| `/api/groups/join` | POST | Join group by code + password |
| `/api/groups/[id]` | GET, PATCH, DELETE | Get / update period / delete group |
| `/api/groups/[id]/expenses` | GET, POST | List / create expenses |
| `/api/groups/[id]/expenses/[eid]` | PATCH, DELETE | Update / delete expense |
| `/api/groups/[id]/categories` | GET, POST | List / create categories |
| `/api/groups/[id]/categories/[cid]` | DELETE | Delete category |
| `/api/groups/[id]/insights` | GET | AI spending insights |
| `/api/notifications` | GET | Current user's in-app notifications |
| `/api/notifications/[id]` | PATCH | Mark notification read |
| `/api/push-subscriptions` | POST, DELETE | Save/remove browser push subscription |
| `/api/parse-expense` | POST | AI voice transcript parsing |
| `/api/cron/keep-supabase-awake` | GET | Protected daily Supabase keepalive |

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Supabase session refresh + protected page redirects + `last_group` persistence |
| `lib/supabase/admin.ts` | Service role Supabase client |
| `lib/auth.ts` | Current Supabase user helpers |
| `lib/groupAuth.ts` | Group membership and owner checks |
| `lib/groupPassword.ts` | Group password hashing and join-code generation |
| `lib/notifications.ts` | In-app notification creation and push dispatch |
| `lib/push.ts` | Web Push / VAPID delivery helper |
| `lib/queryKeys.ts` | React Query cache keys |
| `lib/csvExport.ts` | Client-side CSV generation |
| `lib/offlineQueue.ts` | localStorage offline expense queue |
| `components/GroupNav.tsx` | Bottom nav for group pages |
| `components/VoiceInput.tsx` | Voice input with offline detection |
| `components/NotificationsPanel.tsx` | Unread alert button and app-open expense toast |
| `components/PushNotificationsToggle.tsx` | Per-device PWA push subscription toggle |
| `components/OnlineIndicator.tsx` | Green/red online status dot |
| `worker/index.js` | Custom service worker push/click handling |
| `vercel.json` | Daily Vercel Cron schedule |
| `supabase/schema.sql` | Database schema |
| `PROJECT_REFERENCE.md` | Single source of truth for build phases |

## Database Schema

```sql
-- Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  color text NOT NULL
);

-- Groups (trackers)
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  prev_period_start date,
  created_at timestamptz DEFAULT now()
);

-- Group membership
CREATE TABLE group_members (
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Expenses scoped to group
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
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

-- Notifications and push subscriptions
CREATE TABLE notifications (...);
CREATE TABLE push_subscriptions (...);
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
   CRON_SECRET=
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   VAPID_SUBJECT=
   ```
4. Set the same env vars in Vercel. Google login also requires enabling Google provider and redirect URLs in Supabase Auth.
5. Run `supabase/schema.sql` in Supabase SQL editor
6. `npm run dev`

## Currency

All amounts are in INR.

## Build Phases

See [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md) for the complete phase-by-phase build history and planned features.
