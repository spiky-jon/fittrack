import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export interface DailyGoals {
  calorie_goal: number
  protein_goal_g: number
  carbs_goal_g: number
  fat_goal_g: number
}

export interface DailyGoalRow extends DailyGoals {
  id: string
  user_id: string
  date: string
  created_at: string
  updated_at: string
}

/** Fetch the override row for a specific day. Returns null if none exists. */
export async function getDailyGoal(
  userId: string,
  date: string,
): Promise<DailyGoalRow | null> {
  const { data, error } = await supabase
    .from('daily_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()  // returns null instead of error when no row found

  if (error) throw error
  return data
}

/** Insert or update the override for a specific day. */
export async function upsertDailyGoal(
  userId: string,
  date: string,
  goals: DailyGoals,
): Promise<void> {
  const { error } = await supabase
    .from('daily_goals')
    .upsert(
      { user_id: userId, date, ...goals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    )

  if (error) throw error
}

/** Delete the override for a specific day, reverting to profile defaults. */
export async function resetDailyGoal(userId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('daily_goals')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)

  if (error) throw error
}

/**
 * Returns the goals that should be used for a given day.
 * Prefers a day-specific override; falls back to profile defaults.
 * Pure function — the async fetching is done by the caller / hook.
 */
export function getEffectiveGoals(
  dailyGoal: DailyGoalRow | null,
  profile: Profile | null,
): DailyGoals {
  if (dailyGoal) {
    return {
      calorie_goal:   dailyGoal.calorie_goal,
      protein_goal_g: dailyGoal.protein_goal_g,
      carbs_goal_g:   dailyGoal.carbs_goal_g,
      fat_goal_g:     dailyGoal.fat_goal_g,
    }
  }
  return {
    calorie_goal:   profile?.calorie_goal   ?? 2000,
    protein_goal_g: profile?.protein_goal_g ?? 150,
    carbs_goal_g:   profile?.carbs_goal_g   ?? 250,
    fat_goal_g:     profile?.fat_goal_g     ?? 65,
  }
}
