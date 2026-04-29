import { supabase } from '@/lib/supabase'
import type { WorkoutSession, ExerciseSet } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Session CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  date: string,
  templateId?: string | null,
  name?: string | null,
): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      date,
      template_id: templateId ?? null,
      name: name ?? null,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as WorkoutSession
}

export async function getSession(id: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as WorkoutSession
}

export async function completeSession(id: string, endedAt: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ ended_at: endedAt })
    .eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────────
// Session queries
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch sessions for a given date, with their exercise_sets joined. */
export async function getSessionsForDate(
  userId: string,
  date: string,
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*, sets:exercise_sets(*)')
    .eq('user_id', userId)
    .eq('date', date)
    .order('started_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as WorkoutSession[]
}

/** Fetch recently completed sessions for history. */
export async function getRecentSessions(
  userId: string,
  limit = 10,
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as WorkoutSession[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Set CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getSessionSets(sessionId: string): Promise<ExerciseSet[]> {
  const { data, error } = await supabase
    .from('exercise_sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .order('set_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as ExerciseSet[]
}

export async function addSet(
  sessionId: string,
  exerciseId: string,
  exerciseName: string,
  setNumber: number,
  reps?: number | null,
  weightKg?: number | null,
  _exerciseOrderIndex = 0,
): Promise<ExerciseSet> {
  const { data, error } = await supabase
    .from('exercise_sets')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      set_number: setNumber,
      reps: reps ?? null,
      weight_kg: weightKg ?? null,
      completed: false,
    })
    .select()
    .single()

  if (error) throw error
  return data as ExerciseSet
}

export async function updateSet(
  id: string,
  updates: { reps?: number | null; weight_kg?: number | null; completed?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('exercise_sets')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('exercise_sets').delete().eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────────
// Previous performance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the most recent completed set for a given exercise, across all of
 * the user's finished sessions. Used to show "previous" reference in the logger.
 */
export async function getLastCompletedSet(
  userId: string,
  exerciseId: string,
): Promise<ExerciseSet | null> {
  // Get IDs of recent finished sessions
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(30)

  if (!sessions?.length) return null

  const ids = sessions.map((s: { id: string }) => s.id)

  const { data } = await supabase
    .from('exercise_sets')
    .select('*')
    .in('session_id', ids)
    .eq('exercise_id', exerciseId)
    .eq('completed', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as ExerciseSet | null)
}
