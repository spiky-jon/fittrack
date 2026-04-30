-- Safe to run even if tables already exist — drops and rebuilds cleanly.
-- Any previously saved meals (which had 0 items anyway) will be cleared.

drop table if exists public.saved_meal_items cascade;
drop table if exists public.saved_meals cascade;

create table public.saved_meals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table public.saved_meal_items (
  id uuid default uuid_generate_v4() primary key,
  saved_meal_id uuid references public.saved_meals(id) on delete cascade not null,
  food_name text not null,
  brand text,
  barcode text,
  calories int not null default 0,
  protein_g float default 0,
  carbs_g float default 0,
  fat_g float default 0,
  fibre_g float default 0,
  sugar_g float default 0,
  salt_g float default 0,
  serving_size_g float,
  quantity float default 1,
  created_at timestamptz default now()
);

create index saved_meals_user on public.saved_meals(user_id);

alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;

create policy "Users can CRUD own saved meals" on public.saved_meals
  for all using (auth.uid() = user_id);

-- Mirrors the pattern used by template_exercises in the main schema
create policy "Users can CRUD own saved meal items" on public.saved_meal_items
  for all using (
    exists (select 1 from public.saved_meals m where m.id = saved_meal_id and m.user_id = auth.uid())
  );
