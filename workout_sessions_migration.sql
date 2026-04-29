-- Run in: Supabase Dashboard → SQL Editor
-- Adds exercise_order_index to exercise_sets so the order of exercises
-- within a live session is preserved when grouping sets for display.

alter table public.exercise_sets
  add column if not exists exercise_order_index int not null default 0;
