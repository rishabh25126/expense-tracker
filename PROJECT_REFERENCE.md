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

### Phase 2 — AI Parsing API ✅ COMPLETED (commit: next)
- [x] `/api/parse-expense` POST route
- [x] Auth guard (401 if not logged in)
- [x] Claude Haiku prompt → returns `{ amount, category, date, description }`
- [x] Handles today/yesterday date resolution
- [x] Category auto-detection from keywords

### Phase 3 — Voice Input
- [ ] Build `VoiceInput` component using Web Speech API
- [ ] Show live transcript while user speaks
- [ ] On stop: send transcript to `/api/parse-expense`
- [ ] Display parsed result for user confirmation before saving

### Phase 4 — Expense Entry (Voice + Manual)
- [ ] Voice entry flow: speak → parse → confirm → save
- [ ] Manual entry form: amount, category, date, description
- [ ] Save expense to Supabase `expenses` table
- [ ] Validate: amount required, date defaults to today

### Phase 5 — Expense List
- [ ] Fetch and display all expenses for logged-in user
- [ ] Columns: Amount, Category, Date, Description, Actions
- [ ] Edit expense (inline or modal)
- [ ] Delete expense (with confirmation)
- [ ] Filter by date range
- [ ] Filter by category

### Phase 6 — Dashboard
- [ ] Total spending today
- [ ] Total spending this month
- [ ] Category breakdown (chart or simple list with amounts)
- [ ] Recent 5 expenses

### Phase 7 — Category Management
- [ ] List default + user-created categories
- [ ] Create custom category
- [ ] Delete custom category (prevent if expenses use it)

### Phase 8 — Smart Query (AI)
- [ ] Text input: "How much did I spend on food this week?"
- [ ] Claude converts to structured query params
- [ ] Execute query against Supabase
- [ ] Return natural language answer

### Phase 9 — Spending Insights (AI)
- [ ] Weekly/monthly spending trends
- [ ] Claude generates plain-English insights from expense data

### Phase 10 — Deploy
- [ ] Push to GitHub
- [ ] Connect to Vercel
- [ ] Set environment variables in Vercel dashboard
- [ ] Test production voice input (requires HTTPS — Vercel handles this)

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
│   ├── page.tsx                    # Landing / redirect to dashboard
│   ├── dashboard/
│   │   └── page.tsx
│   ├── expenses/
│   │   └── page.tsx
│   ├── categories/
│   │   └── page.tsx
│   └── auth/
│       ├── login/page.tsx
│       └── signup/page.tsx
├── components/
│   ├── VoiceInput.tsx
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── ExpenseCard.tsx
│   ├── Dashboard.tsx
│   └── CategoryManager.tsx
├── app/api/
│   ├── parse-expense/route.ts
│   ├── expenses/route.ts
│   └── query/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── claude.ts
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
- Offline expense queue (PWA phase 2 — save locally when offline, sync when back online)

---

## Build Order Summary

1. Setup (Next.js + Supabase + env vars)
2. Auth (login/signup)
3. AI parse API route
4. Voice input component
5. Expense entry (voice + manual)
6. Expense list (with edit/delete/filter)
7. Dashboard
8. Category management
9. Smart query (AI)
10. Deploy to Vercel
