-- Run in: Supabase Dashboard → SQL Editor
-- Adds a unique constraint on (user_id, date) so upsertWeightLog works correctly
-- (only one weight entry per user per day).

alter table public.weight_logs
  add constraint weight_logs_user_date_unique unique (user_id, date);
