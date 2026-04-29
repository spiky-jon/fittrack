-- Run in: Supabase Dashboard → SQL Editor
-- Adds per-day calorie/macro goal overrides on top of the profile defaults.

create table public.daily_goals (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  date         date not null,
  calorie_goal int  not null,
  protein_goal_g int not null,
  carbs_goal_g   int not null,
  fat_goal_g     int not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (user_id, date)
);

alter table public.daily_goals enable row level security;

create policy "Users can CRUD own daily goals"
  on public.daily_goals for all
  using (auth.uid() = user_id);
