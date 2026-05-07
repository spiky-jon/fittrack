import { useState, useEffect, useCallback, useRef } from 'react'
import type { WorkoutSession, ExerciseSet } from '@/types'
import type { Exercise } from '@/services/exerciseDb'
import {
  getSession, getSessionSets, completeSession,
  addSet as dbAddSet, updateSet as dbUpdateSet, deleteSet as dbDeleteSet,
  getLastCompletedSet, getPreviousSessionSets,
} from '@/services/workoutSessions'

// ── Public types ──────────────────────────────────────────────────────────────

export interface ExerciseGroup {
  exercise_id: string
  exercise_name: string
  order_index: number
  sets: ExerciseSet[]
  /** Last completed set for this exercise from any previous session. */
  previousSet: { reps: number | null; weight_kg: number | null } | null
}

export interface UseWorkoutSessionReturn {
  session: WorkoutSession | null
  exercises: ExerciseGroup[]
  loading: boolean
  error: string | null
  addExercise: (exercise: Exercise) => Promise<void>
  addSet: (exerciseId: string, exerciseName: string) => Promise<void>
  addWarmupSet: (exerciseId: string, exerciseName: string) => Promise<void>
  updateSet: (
    setId: string,
    updates: { reps?: number | null; weight_kg?: number | null; completed?: boolean },
  ) => Promise<void>
  removeSet: (setId: string) => Promise<void>
  removeExercise: (exerciseId: string) => Promise<void>
  finishWorkout: () => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWorkoutSession(sessionId: string): UseWorkoutSessionReturn {
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [exercises, setExercises] = useState<ExerciseGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep a ref so callbacks always see the latest exercises without stale closures
  const exercisesRef = useRef<ExerciseGroup[]>([])
  exercisesRef.current = exercises

  // ── Load session + sets on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false

    async function load() {
      try {
        const [sess, sets] = await Promise.all([
          getSession(sessionId),
          getSessionSets(sessionId),
        ])

        if (cancelled) return
        if (!sess) { setError('Session not found'); setLoading(false); return }

        setSession(sess)
        const groups = buildGroups(sets)
        setExercises(groups)
        setLoading(false)

        // Load previous performance in background — doesn't block the UI
        const prevResults = await Promise.all(
          groups.map(g => getLastCompletedSet(sess.user_id, g.exercise_id).catch(() => null)),
        )
        if (cancelled) return
        setExercises(gs =>
          gs.map((g, i) => {
            const p = prevResults[i]
            return p ? { ...g, previousSet: { reps: p.reps, weight_kg: p.weight_kg } } : g
          }),
        )
      } catch {
        if (!cancelled) { setError('Failed to load workout'); setLoading(false) }
      }
    }

    load()
    return () => { cancelled = true }
  }, [sessionId])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addExercise = useCallback(async (exercise: Exercise) => {
    if (!session) return
    const orderIndex = exercisesRef.current.length

    const prevSets = await getPreviousSessionSets(session.user_id, exercise.id).catch(() => [])

    let newSets: ExerciseSet[]
    if (prevSets.length > 0) {
      newSets = await Promise.all(
        prevSets.map((p, i) =>
          dbAddSet(session.id, exercise.id, exercise.name, i + 1, p.reps, p.weight_kg, orderIndex),
        ),
      )
    } else {
      newSets = [await dbAddSet(session.id, exercise.id, exercise.name, 1, null, null, orderIndex)]
    }

    setExercises(gs => [
      ...gs,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        order_index: orderIndex,
        sets: newSets,
        previousSet: prevSets.length > 0
          ? { reps: prevSets[0].reps, weight_kg: prevSets[0].weight_kg }
          : null,
      },
    ])
  }, [session])

  const addSet = useCallback(async (exerciseId: string, exerciseName: string) => {
    if (!session) return
    const group = exercisesRef.current.find(g => g.exercise_id === exerciseId)
    if (!group) return

    const regularSets = group.sets.filter(s => s.set_number > 0)
    const maxSetNum = regularSets.length > 0 ? Math.max(...regularSets.map(s => s.set_number)) : 0
    const lastRegular = [...regularSets].sort((a, b) => b.set_number - a.set_number)[0] ?? null

    const newSet = await dbAddSet(
      session.id,
      exerciseId,
      exerciseName,
      maxSetNum + 1,
      lastRegular?.reps ?? null,
      lastRegular?.weight_kg ?? null,
      group.order_index,
    )
    setExercises(gs =>
      gs.map(g =>
        g.exercise_id === exerciseId
          ? { ...g, sets: [...g.sets, newSet].sort((a, b) => a.set_number - b.set_number) }
          : g,
      ),
    )
  }, [session])

  const addWarmupSet = useCallback(async (exerciseId: string, exerciseName: string) => {
    if (!session) return
    const group = exercisesRef.current.find(g => g.exercise_id === exerciseId)
    if (!group) return

    const newSet = await dbAddSet(
      session.id,
      exerciseId,
      exerciseName,
      0,
      null,
      null,
      group.order_index,
    )
    setExercises(gs =>
      gs.map(g =>
        g.exercise_id === exerciseId
          ? { ...g, sets: [...g.sets, newSet].sort((a, b) => a.set_number - b.set_number) }
          : g,
      ),
    )
  }, [session])

  const updateSet = useCallback(async (
    setId: string,
    updates: { reps?: number | null; weight_kg?: number | null; completed?: boolean },
  ) => {
    // Optimistic update — DB write in background
    setExercises(gs =>
      gs.map(g => ({
        ...g,
        sets: g.sets.map(s => s.id === setId ? { ...s, ...updates } : s),
      })),
    )
    await dbUpdateSet(setId, updates)
  }, [])

  const removeSet = useCallback(async (setId: string) => {
    setExercises(gs =>
      gs
        .map(g => ({ ...g, sets: g.sets.filter(s => s.id !== setId) }))
        .filter(g => g.sets.length > 0),
    )
    await dbDeleteSet(setId)
  }, [])

  const removeExercise = useCallback(async (exerciseId: string) => {
    const group = exercisesRef.current.find(g => g.exercise_id === exerciseId)
    if (!group) return
    setExercises(gs => gs.filter(g => g.exercise_id !== exerciseId))
    await Promise.all(group.sets.map(s => dbDeleteSet(s.id)))
  }, [])

  const finishWorkout = useCallback(async () => {
    if (!session) return
    const endedAt = new Date().toISOString()
    await completeSession(session.id, endedAt)
    setSession(s => s ? { ...s, ended_at: endedAt } : s)
  }, [session])

  return { session, exercises, loading, error, addExercise, addSet, addWarmupSet, updateSet, removeSet, removeExercise, finishWorkout }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildGroups(sets: ExerciseSet[]): ExerciseGroup[] {
  const map = new Map<string, ExerciseGroup>()
  for (const s of sets) {
    if (!map.has(s.exercise_id)) {
      map.set(s.exercise_id, {
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        order_index: s.exercise_order_index ?? 0,
        sets: [],
        previousSet: null,
      })
    }
    map.get(s.exercise_id)!.sets.push(s)
  }
  return Array.from(map.values())
    .sort((a, b) => a.order_index - b.order_index)
    .map(g => ({ ...g, sets: g.sets.sort((a, b) => a.set_number - b.set_number) }))
}
