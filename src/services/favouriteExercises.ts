import { supabase } from '@/lib/supabase'
import type { Exercise } from '@/services/exerciseDb'

export interface FavouriteExercise {
  id: string
  user_id: string
  exercise_id: string
  exercise_name: string
  target_muscle: string | null
  equipment: string | null
  created_at: string
}

export async function getFavourites(userId: string): Promise<FavouriteExercise[]> {
  const { data, error } = await supabase
    .from('favourite_exercises')
    .select('*')
    .eq('user_id', userId)
    .order('exercise_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addFavourite(userId: string, exercise: Exercise): Promise<FavouriteExercise> {
  const { data, error } = await supabase
    .from('favourite_exercises')
    .insert({
      user_id: userId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      target_muscle: exercise.primaryMuscles[0] ?? null,
      equipment: exercise.equipment ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as FavouriteExercise
}

export async function removeFavourite(userId: string, exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('favourite_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
  if (error) throw error
}

export async function isFavourite(userId: string, exerciseId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favourite_exercises')
    .select('id')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .maybeSingle()
  return data !== null
}
