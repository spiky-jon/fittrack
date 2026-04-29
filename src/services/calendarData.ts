import { supabase } from '@/lib/supabase'
import { format, getDaysInMonth } from 'date-fns'

export interface DaySummary {
  date: string
  hasFood: boolean
  hasWorkout: boolean
  hasWeight: boolean
}

/**
 * Returns one DaySummary per day that has any activity in the given month.
 * Uses three parallel queries then merges into a single map.
 */
export async function getMonthSummary(
  userId: string,
  year: number,
  month: number, // 1-based
): Promise<DaySummary[]> {
  const start = format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
  const end = format(
    new Date(year, month - 1, getDaysInMonth(new Date(year, month - 1))),
    'yyyy-MM-dd',
  )
  return getWeekSummary(userId, start, end)
}

/**
 * Returns one DaySummary per day that has any activity between startDate and
 * endDate (inclusive). Also used by the dashboard week strip.
 */
export async function getWeekSummary(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<DaySummary[]> {
  const [foodResult, workoutResult, weightResult] = await Promise.all([
    supabase
      .from('food_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('workout_sessions')
      .select('date')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('weight_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate),
  ])

  if (foodResult.error) throw foodResult.error
  if (workoutResult.error) throw workoutResult.error
  if (weightResult.error) throw weightResult.error

  const map = new Map<string, { hasFood: boolean; hasWorkout: boolean; hasWeight: boolean }>()

  const ensure = (date: string) =>
    map.get(date) ?? { hasFood: false, hasWorkout: false, hasWeight: false }

  for (const row of foodResult.data ?? []) {
    map.set(row.date, { ...ensure(row.date), hasFood: true })
  }
  for (const row of workoutResult.data ?? []) {
    map.set(row.date, { ...ensure(row.date), hasWorkout: true })
  }
  for (const row of weightResult.data ?? []) {
    map.set(row.date, { ...ensure(row.date), hasWeight: true })
  }

  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }))
}
