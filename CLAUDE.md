# AI Voice Expense Manager — Claude Code Instructions

## Project Context
This is a voice-first expense tracking PWA built with Next.js 15, TypeScript (strict), Supabase, and Anthropic Claude API. Always read `PROJECT_REFERENCE.md` at the start of every session — it is the single source of truth for all build phases, features, and architecture decisions.

## Essential References
- **PROJECT_REFERENCE.md** — build phases, tech stack, schema, file structure, feature specs
- **README.md** — project overview, architecture, routing, API routes, setup. Keep updated with any changes to features, routes, or architecture.

## Rules
- Always read `PROJECT_REFERENCE.md` before making changes
- After completing any feature/phase, update `PROJECT_REFERENCE.md` (mark completed, add new files to structure, update build order)
- After any architecture or feature change, update `README.md` with essential knowledge and flow
- Do not include personal information (credentials, API keys, real names) in README.md or any committed file
- Use minimum tokens / no over-engineering — this is a personal project
- Currency is INR
- AI model for runtime expense parsing: `claude-haiku-4-5-20251001`
- Git commits: include `Co-Authored-By: Claude <noreply@anthropic.com>`

## Tech Stack
- Next.js 15 App Router + TypeScript strict
- Supabase (PostgreSQL) with service role key (bypasses RLS)
- React Query for client-side data caching
- `next-pwa` for PWA/offline support
- Cookie auth (`app_session=1`, HttpOnly)
- Anthropic Claude API for voice parsing + spending insights

## Key Patterns
- All API routes check `isAuthed()` from `lib/auth.ts`
- All DB access via `createAdminClient()` from `lib/supabase/admin.ts`
- React Query keys defined in `lib/queryKeys.ts`
- Expenses/categories scoped by `group_id` (no user_id — single user)
- Period filtering is client-side (not in SQL queries)
- Offline expenses queued in localStorage, auto-synced on reconnect
