import { supabase } from '@/lib/supabase'
import type { FoodLog, DailyLog } from '@/types'

// Fetch all food logs for a given date and user
export async function getFoodLogsForDate(userId: string, date: string): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

// Add a food log entry
export async function addFoodLog(log: Omit<FoodLog, 'id' | 'created_at'>): Promise<FoodLog> {
  const { data, error } = await supabase
    .from('food_logs')
    .insert(log)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a food log entry
export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Update quantity for a food log entry
export async function updateFoodLogQuantity(id: string, quantity: number): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .update({ quantity })
    .eq('id', id)

  if (error) throw error
}

// Group logs by meal and calculate totals
export function buildDailyLog(date: string, logs: FoodLog[]): DailyLog {
  const meals: DailyLog['meals'] = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  }

  for (const log of logs) {
    meals[log.meal_type].push(log)
  }

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein_g: acc.protein_g + log.protein_g,
      carbs_g: acc.carbs_g + log.carbs_g,
      fat_g: acc.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  return { date, meals, totals }
}

// Fetch logs for a date range (used by calendar view)
export async function getFoodLogSummariesForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; calories: number }[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('date, calories')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw error

  // Group and sum by date
  const byDate: Record<string, number> = {}
  for (const row of data ?? []) {
    byDate[row.date] = (byDate[row.date] ?? 0) + row.calories
  }

  return Object.entries(byDate).map(([date, calories]) => ({ date, calories }))
}
