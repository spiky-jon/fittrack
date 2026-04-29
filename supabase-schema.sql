-- ============================================
-- FitTrack Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------
-- USERS (extends Supabase auth.users)
-- ----------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  dob date,
  height_cm int,
  goal_weight_kg float,

  -- Calorie & macro goals
  calorie_goal int default 2000,
  protein_goal_g int default 150,
  carbs_goal_g int default 200,
  fat_goal_g int default 65,

  -- Unit preferences
  unit_weight text default 'kg' check (unit_weight in ('kg', 'lbs')),
  unit_height text default 'cm' check (unit_height in ('cm', 'ft_in')),
  unit_energy text default 'kcal' check (unit_energy in ('kcal', 'kj')),
  week_start text default 'monday' check (week_start in ('monday', 'sunday')),

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------
-- FOOD LOGS
-- ----------------------------------------
create table public.food_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),

  -- Food details (snapshotted from Open Food Facts at time of logging)
  food_name text not null,
  brand text,
  barcode text,

  -- Nutrition per serving logged
  calories int not null default 0,
  protein_g float default 0,
  carbs_g float default 0,
  fat_g float default 0,
  fibre_g float default 0,
  sugar_g float default 0,
  salt_g float default 0,

  -- Serving info
  serving_size_g float,
  quantity float default 1,   -- number of servings

  created_at timestamptz default now()
);

create index food_logs_user_date on public.food_logs(user_id, date);

-- ----------------------------------------
-- WEIGHT LOGS
-- ----------------------------------------
create table public.weight_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  weight_kg float not null,   -- always stored in kg; convert for display
  notes text,
  created_at timestamptz default now()
);

create index weight_logs_user_date on public.weight_logs(user_id, date);

-- ----------------------------------------
-- WORKOUT TEMPLATES
-- ----------------------------------------
create table public.workout_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.template_exercises (
  id uuid default uuid_generate_v4() primary key,
  template_id uuid references public.workout_templates(id) on delete cascade not null,
  exercise_id text not null,        -- ExerciseDB ID
  exercise_name text not null,
  order_index int not null,
  default_sets int default 3,
  default_reps int default 10,
  default_weight_kg float,
  created_at timestamptz default now()
);

-- ----------------------------------------
-- WORKOUT SESSIONS
-- ----------------------------------------
create table public.workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  template_id uuid references public.workout_templates(id) on delete set null,  -- nullable (ad-hoc sessions)
  date date not null,
  name text,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create index workout_sessions_user_date on public.workout_sessions(user_id, date);

create table public.exercise_sets (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_id text not null,        -- ExerciseDB ID
  exercise_name text not null,
  set_number int not null,
  reps int,
  weight_kg float,                  -- always stored in kg; convert for display
  completed boolean default false,
  created_at timestamptz default now()
);

-- ----------------------------------------
-- ROW LEVEL SECURITY
-- Users can only see and edit their own data
-- ----------------------------------------
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_sets enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Food logs
create policy "Users can CRUD own food logs" on public.food_logs for all using (auth.uid() = user_id);

-- Weight logs
create policy "Users can CRUD own weight logs" on public.weight_logs for all using (auth.uid() = user_id);

-- Workout templates
create policy "Users can CRUD own templates" on public.workout_templates for all using (auth.uid() = user_id);
create policy "Users can CRUD own template exercises" on public.template_exercises
  for all using (
    exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid())
  );

-- Workout sessions
create policy "Users can CRUD own sessions" on public.workout_sessions for all using (auth.uid() = user_id);
create policy "Users can CRUD own sets" on public.exercise_sets
  for all using (
    exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
