import { useState, useEffect } from 'react'
import {
  getFavourites, addFavourite, removeFavourite,
  type FavouriteExercise,
} from '@/services/favouriteExercises'
import type { Exercise } from '@/services/exerciseDb'

export function useFavouriteExercises(userId: string) {
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set())
  const [favourites, setFavourites] = useState<FavouriteExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    getFavourites(userId)
      .then(data => {
        setFavourites(data)
        setFavouriteIds(new Set(data.map(f => f.exercise_id)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  async function toggleFavourite(exercise: Exercise) {
    if (!userId) return
    const isFav = favouriteIds.has(exercise.id)

    if (isFav) {
      // Optimistic remove
      setFavouriteIds(prev => { const s = new Set(prev); s.delete(exercise.id); return s })
      setFavourites(prev => prev.filter(f => f.exercise_id !== exercise.id))
      try {
        await removeFavourite(userId, exercise.id)
      } catch {
        // Rollback by re-fetching
        const data = await getFavourites(userId)
        setFavourites(data)
        setFavouriteIds(new Set(data.map(f => f.exercise_id)))
      }
    } else {
      // Optimistic add
      const tempId = `temp-${exercise.id}`
      const tempFav: FavouriteExercise = {
        id: tempId,
        user_id: userId,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        target_muscle: exercise.primaryMuscles[0] ?? null,
        equipment: exercise.equipment ?? null,
        created_at: new Date().toISOString(),
      }
      setFavouriteIds(prev => new Set([...prev, exercise.id]))
      setFavourites(prev => [...prev, tempFav])
      try {
        const added = await addFavourite(userId, exercise)
        setFavourites(prev => prev.map(f => f.id === tempId ? added : f))
      } catch {
        // Rollback
        setFavouriteIds(prev => { const s = new Set(prev); s.delete(exercise.id); return s })
        setFavourites(prev => prev.filter(f => f.id !== tempId))
      }
    }
  }

  return { favouriteIds, favourites, toggleFavourite, loading }
}
