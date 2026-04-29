# FitTrack

A React + TypeScript + Supabase fitness and nutrition tracking app.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in your Supabase project URL and anon key.
Find these at: https://supabase.com/dashboard → your project → Settings → API

### 3. Set up the database
- Open your Supabase project → SQL Editor
- Paste and run the contents of `supabase-schema.sql`
- This creates all tables, indexes, and Row Level Security policies

### 4. Run the dev server
```bash
npm run dev
```

---

## Using Claude Code to build out the UI

Once the scaffold is in place, open your terminal inside Cursor and run:

```bash
claude
```

Then paste the contents of `CLAUDE_CODE_PROMPT.md` — Claude Code will build out
all the pages and components, starting with the food logging module.

---

## Project Structure

```
src/
├── components/
│   ├── auth/          # Login, Register forms
│   ├── food/          # Food search, meal sections, daily summary
│   ├── layout/        # AppLayout, navigation
│   └── ui/            # Shared UI: buttons, inputs, modals, spinners
├── hooks/
│   ├── useAuthInit.ts # Initialises Supabase auth on app load
│   └── useFoodLog.ts  # Fetches + manages daily food logs
├── lib/
│   ├── supabase.ts    # Supabase client
│   └── units.ts       # kg↔lbs, cm↔ft/in conversion utilities
├── pages/
│   ├── DashboardPage.tsx
│   ├── FoodLogPage.tsx    ← Phase 1 priority
│   ├── WorkoutsPage.tsx
│   ├── CalendarPage.tsx
│   ├── ProfilePage.tsx
│   └── SettingsPage.tsx
├── services/
│   ├── openFoodFacts.ts   # Open Food Facts API integration
│   └── foodLogs.ts        # Supabase CRUD for food logs
├── store/
│   └── authStore.ts       # Zustand: user + profile state
└── types/
    └── index.ts           # All TypeScript types
```

## External APIs

| API | Purpose | Cost |
|-----|---------|------|
| [Open Food Facts](https://world.openfoodfacts.org/data) | Food search + barcode lookup | Free |
| [ExerciseDB](https://exercisedb.dev) | Exercise database | Free / open source |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| State | Zustand |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Recharts |
