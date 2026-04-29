# FitTrack — Claude Code Build Prompt
# =====================================
# Use this in your terminal inside Cursor:
#
#   1. cd into your project folder
#   2. Run: claude
#   3. Paste the prompt below
# =====================================

---

I'm building FitTrack, a React + TypeScript + Supabase fitness and nutrition tracking web app.

The project scaffold, types, services, hooks, and routing are already set up. Here's what exists:

**Already created:**
- `package.json` with all dependencies (React 18, Vite, Supabase, Zustand, React Router, Recharts, Tailwind)
- `src/types/index.ts` — all TypeScript types (Profile, FoodLog, WorkoutSession, etc.)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/units.ts` — kg/lbs/cm/ft conversion utilities
- `src/services/openFoodFacts.ts` — Open Food Facts API (search + barcode lookup)
- `src/services/foodLogs.ts` — Supabase CRUD for food_logs table
- `src/store/authStore.ts` — Zustand store for auth + profile
- `src/hooks/useAuthInit.ts` — initialises Supabase auth listener on app load
- `src/hooks/useFoodLog.ts` — fetches and manages daily food logs
- `src/App.tsx` — React Router setup with all routes defined
- `supabase-schema.sql` — full DB schema (already run in Supabase)
- `.env.local` — Supabase credentials filled in

**Please build the following components and pages:**

## 1. Install dependencies & setup Tailwind
Run `npm install` and initialise Tailwind CSS config.

## 2. src/main.tsx
Entry point — renders App into #root with any global providers needed.

## 3. src/index.css
Tailwind directives + any global base styles.

## 4. src/components/layout/AppLayout.tsx
Persistent layout with:
- Top nav bar showing app name and user avatar/name
- Bottom navigation tabs: Dashboard, Food, Workouts, Calendar, Profile
- `<Outlet />` from React Router for page content

## 5. src/pages/LoginPage.tsx & RegisterPage.tsx
Clean auth forms using Supabase auth. LoginPage should have email + password fields and a link to register. RegisterPage should have name, email, and password fields.

## 6. src/pages/FoodLogPage.tsx  ← PRIORITY
This is the main calorie tracking page. It should:
- Show today's date (with prev/next day navigation arrows)
- Show a daily summary card at the top: calories consumed vs goal, and a macro breakdown bar (protein / carbs / fat)
- Show 4 meal sections: Breakfast, Lunch, Dinner, Snacks
- Each meal section lists logged food items with name, calories, and a delete button
- Each meal section has an "+ Add food" button that opens a search modal
- The search modal has a text search input that calls the Open Food Facts API
- Search results show product name, brand, and calories per 100g
- Tapping a result lets the user set a quantity (in grams) then add to that meal
- Use the `useFoodLog` hook for data fetching and mutations
- Use the `useAuthStore` for the current user

## 7. src/pages/DashboardPage.tsx
Summary view showing:
- Today's calorie progress (calories consumed / goal)
- Macro rings or bars (protein, carbs, fat vs goals)
- A small recent activity section (last workout logged, last weight entry)

## 8. src/pages/ProfilePage.tsx & SettingsPage.tsx
- Profile: edit name, DOB, height, goal weight
- Settings: unit preferences (kg/lbs, cm/ft, kcal/kJ), calorie goal, macro goals
- Save to the profiles table in Supabase

## Styling notes
- Use Tailwind CSS throughout
- Dark theme preferred: dark slate/zinc backgrounds
- Accent colour: a vibrant green (like #22c55e or similar)
- Clean, modern, mobile-friendly layout (max-width ~480px centred, like a mobile app)
- Good spacing, readable typography

## Important patterns to follow
- All weights stored in kg in DB, converted using `src/lib/units.ts` for display
- Nutrition always stored per actual quantity consumed (not per 100g)
- Use Zustand `useAuthStore` for user/profile state
- Use React Router `useNavigate` for navigation
- Errors should show inline (not alert() dialogs)
- Loading states should show a spinner or skeleton

Please build these files one at a time, starting with main.tsx, then the layout, then FoodLogPage as the priority.
