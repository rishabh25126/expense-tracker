-- Run this in Supabase SQL editor

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  category text not null,
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null
);

-- RLS
alter table expenses enable row level security;
alter table categories enable row level security;

create policy "own expenses" on expenses using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own categories" on categories using (auth.uid() = user_id) with check (auth.uid() = user_id);
