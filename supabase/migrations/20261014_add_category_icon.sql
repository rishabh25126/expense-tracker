-- Safe to run on the existing database: preserves all groups, categories, and expenses.
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text;
