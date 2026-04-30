-- Run this in Supabase Dashboard → SQL Editor if you already ran saved_meals_migration.sql
-- Replaces the broad FOR ALL policy with explicit per-operation policies that
-- include a proper WITH CHECK clause for INSERT (required for RLS to allow inserts).

drop policy if exists "Users can CRUD own saved meal items" on public.saved_meal_items;

create policy "Users can select own saved meal items" on public.saved_meal_items
  for select using (
    exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = auth.uid())
  );

create policy "Users can insert own saved meal items" on public.saved_meal_items
  for insert with check (
    exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = auth.uid())
  );

create policy "Users can delete own saved meal items" on public.saved_meal_items
  for delete using (
    exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = auth.uid())
  );
