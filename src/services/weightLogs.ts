import { supabase } from '@/lib/supabase'
import type { WeightLog } from '@/types'

export async function getWeightLogs(userId: string, limit = 30): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getWeightLogsForRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function addWeightLog(
  userId: string,
  date: string,
  weightKg: number,
  notes?: string,
): Promise<WeightLog> {
  const { data, error } = await supabase
    .from('weight_logs')
    .insert({ user_id: userId, date, weight_kg: weightKg, notes: notes ?? null })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function upsertWeightLog(
  userId: string,
  date: string,
  weightKg: number,
  notes?: string,
): Promise<WeightLog> {
  const { data, error } = await supabase
    .from('weight_logs')
    .upsert(
      { user_id: userId, date, weight_kg: weightKg, notes: notes ?? null },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWeightLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('weight_logs')
    .delete()
    .eq('id', id)

  if (error) throw error
}
