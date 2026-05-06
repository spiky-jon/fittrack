-- ============================================
-- Favourite Exercises Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

create table public.favourite_exercises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  exercise_id text not null,
  exercise_name text not null,
  target_muscle text,
  equipment text,
  created_at timestamptz default now(),
  unique (user_id, exercise_id)
);

create index favourite_exercises_user on public.favourite_exercises(user_id);

alter table public.favourite_exercises enable row level security;

create policy "Users can CRUD own favourite exercises" on public.favourite_exercises
  for all using (auth.uid() = user_id);
