import { useState, useEffect, useCallback, useRef } from 'react'
import type { WorkoutSession, ExerciseSet } from '@/types'
import type { Exercise } from '@/services/exerciseDb'
import {
  getSession, getSessionSets, completeSession,
  addSet as dbAddSet, updateSet as dbUpdateSet, deleteSet as dbDeleteSet,
  getLastCompletedSet,
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
  updateSet: (
    setId: string,
    updates: { reps?: number | null; weight_kg?: number | null; completed?: boolean },
  ) => Promise<void>
  removeSet: (setId: string) => Promise<void>
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
    const newSet = await dbAddSet(
      session.id,
      exercise.id,
      exercise.name,
      1,
      null,
      null,
      orderIndex,
    )
    const prevSet = await getLastCompletedSet(session.user_id, exercise.id).catch(() => null)
    setExercises(gs => [
      ...gs,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        order_index: orderIndex,
        sets: [newSet],
        previousSet: prevSet ? { reps: prevSet.reps, weight_kg: prevSet.weight_kg } : null,
      },
    ])
  }, [session])

  const addSet = useCallback(async (exerciseId: string, exerciseName: string) => {
    if (!session) return
    const group = exercisesRef.current.find(g => g.exercise_id === exerciseId)
    if (!group) return

    const lastSet = group.sets[group.sets.length - 1]
    const setNumber = (lastSet?.set_number ?? 0) + 1

    const newSet = await dbAddSet(
      session.id,
      exerciseId,
      exerciseName,
      setNumber,
      lastSet?.reps ?? null,
      lastSet?.weight_kg ?? null,
      group.order_index,
    )
    setExercises(gs =>
      gs.map(g => g.exercise_id === exerciseId ? { ...g, sets: [...g.sets, newSet] } : g),
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
        .filter(g => g.sets.length > 0), // drop exercise block when last set removed
    )
    await dbDeleteSet(setId)
  }, [])

  const finishWorkout = useCallback(async () => {
    if (!session) return
    await completeSession(session.id, new Date().toISOString())
  }, [session])

  return { session, exercises, loading, error, addExercise, addSet, updateSet, removeSet, finishWorkout }
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
