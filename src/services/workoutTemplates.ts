import { supabase } from '@/lib/supabase'
import type { WorkoutTemplate, TemplateExercise } from '@/types'
import type { Exercise } from '@/services/exerciseDb'

export type TemplateWithExercises = WorkoutTemplate & { exercises: TemplateExercise[] }

// ── Templates ─────────────────────────────────────────────────────────────────

export async function getTemplates(userId: string): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getTemplate(id: string): Promise<TemplateWithExercises | null> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*, exercises:template_exercises(*)')
    .eq('id', id)
    .order('order_index', { referencedTable: 'template_exercises', ascending: true })
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return {
    ...data,
    exercises: (data.exercises ?? []).sort(
      (a: TemplateExercise, b: TemplateExercise) => a.order_index - b.order_index,
    ),
  }
}

export async function createTemplate(
  userId: string,
  name: string,
  description?: string,
): Promise<WorkoutTemplate> {
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id: userId, name: name.trim(), description: description?.trim() || null })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTemplate(
  id: string,
  updates: { name?: string; description?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Template exercises ────────────────────────────────────────────────────────

export async function addExerciseToTemplate(
  templateId: string,
  exercise: Exercise,
  orderIndex: number,
  opts: { sets?: number; reps?: number; weightKg?: number | null } = {},
): Promise<TemplateExercise> {
  const { data, error } = await supabase
    .from('template_exercises')
    .insert({
      template_id: templateId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      order_index: orderIndex,
      default_sets: opts.sets ?? 3,
      default_reps: opts.reps ?? 10,
      default_weight_kg: opts.weightKg ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTemplateExercise(
  id: string,
  updates: { default_sets?: number; default_reps?: number; default_weight_kg?: number | null },
): Promise<void> {
  const { error } = await supabase
    .from('template_exercises')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function removeExerciseFromTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('template_exercises')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function reorderTemplateExercises(
  exercises: { id: string; order_index: number }[],
): Promise<void> {
  // Supabase doesn't support true batch update, so fire individually.
  // These are fast metadata writes and there's typically <20 exercises per template.
  await Promise.all(
    exercises.map(({ id, order_index }) =>
      supabase.from('template_exercises').update({ order_index }).eq('id', id),
    ),
  )
}
